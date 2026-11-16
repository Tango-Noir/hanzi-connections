#!/usr/bin/env node
/**
 * 汉字联系 · 题目编辑器（控制台版）
 *
 * 固定编辑【本脚本所在目录】下的 puzzles.js —— 没有文件选择框，不会碰其他文件。
 * 用法：双击「编辑题目.bat」，或在本目录打开终端执行  node puzzles-editor.js
 *
 * 安全机制：
 *   - 覆盖前先把旧文件备份到同目录的 puzzles.bak.js
 *   - 先写临时文件 → 读回校验 → 再原子替换 puzzles.js → 再读回校验
 *   - puzzles.js 为空 / 损坏时给出明确警告，损坏文件先备份
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const FILE = path.join(__dirname, 'puzzles.js');
const BAK = path.join(__dirname, 'puzzles.bak.js');
const TMP = path.join(__dirname, 'puzzles.tmp.js');
const GROUP_COLORS = ['yellow', 'green', 'blue', 'purple']; // 按 1~4 行顺序分配

let oldRaw = ''; // puzzles.js 原始文本（用于备份 / 判定损坏）
let list = [];   // 当前题目列表
let loadWarn = '';

// ---------- 基础 ----------

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function byDate(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

function load() {
  if (!fs.existsSync(FILE)) {
    loadWarn = 'puzzles.js 尚不存在（保存后会自动创建）。';
    return;
  }
  oldRaw = fs.readFileSync(FILE, 'utf8');
  const text = oldRaw.trim();
  if (!text) {
    loadWarn = '警告：puzzles.js 是空文件（可能上次保存出了问题）。继续并保存会用新内容覆盖它。';
    return;
  }
  try {
    const fake = {};
    new Function('window', text)(fake);
    if (!Array.isArray(fake.PUZZLES)) throw new Error('PUZZLES 不是数组');
    for (const p of fake.PUZZLES) {
      if (p && typeof p === 'object' && typeof p.date === 'string' &&
          Array.isArray(p.items) && Array.isArray(p.groups)) {
        list.push(p);
      }
    }
  } catch (e) {
    // 文件损坏：先备份原始内容，再按空题库继续
    try { fs.writeFileSync(BAK, oldRaw, 'utf8'); } catch (_) { /* 忽略备份失败 */ }
    loadWarn = '警告：puzzles.js 内容解析失败（文件可能损坏）。原文件已备份到 puzzles.bak.js，继续保存会用新内容覆盖。';
  }
}

function buildJs() {
  const sorted = list.slice().sort(byDate);
  const lines = [
    '// 题目数据由出题人填写，代码只读取，不做任何判断。',
    'window.PUZZLES = ' + JSON.stringify(sorted, null, 2) + ';',
    '',
    '// 数据格式（每条题目）：',
    '// {',
    '//   date: string，格式 "YYYY-MM-DD"',
    '//   items: string[16]，16 个不重复的汉字',
    '//   groups: Array<{ category: string, items: string[4], color?: "yellow" | "green" | "blue" | "purple" }>，4 组，每组 4 个字',
    '// }',
    '// category 完全由出题人填写，代码只负责显示。',
    '// color 可选，只用于已解出组和结算面板的样式。',
    ''
  ];
  return lines.join('\n');
}

function save() {
  // 1) 备份旧版（旧内容非空时）
  if (oldRaw.trim()) {
    try { fs.writeFileSync(BAK, oldRaw, 'utf8'); }
    catch (e) { throw new Error('备份失败：' + e.message); }
  }
  // 2) 写临时文件
  const text = buildJs();
  fs.writeFileSync(TMP, text, 'utf8');
  // 3) 读回临时文件校验
  let chk;
  try { chk = fs.readFileSync(TMP, 'utf8'); }
  catch (e) { throw new Error('读回临时文件失败：' + e.message); }
  if (!chk || chk.indexOf('window.PUZZLES') === -1) {
    try { fs.unlinkSync(TMP); } catch (_) { /* 忽略 */ }
    throw new Error('写入校验失败：临时文件为空');
  }
  // 4) 原子替换
  fs.renameSync(TMP, FILE);
  // 5) 替换后再读回校验
  const finalText = fs.readFileSync(FILE, 'utf8');
  if (!finalText || finalText.indexOf('window.PUZZLES') === -1) {
    throw new Error('写入校验失败：保存后的文件为空');
  }
  oldRaw = finalText; // 备份基线更新为最新内容
}

function doSave(what) {
  try {
    save();
    console.log('  ✓ 已保存' + what + '（校验通过），共 ' + list.length + ' 条。覆盖前的版本备份在 puzzles.bak.js');
  } catch (e) {
    console.log('  ✗ 保存失败：' + e.message + '。你的文件未被改动（或已备份在 puzzles.bak.js）。');
  }
}

// ---------- 解析 / 校验 ----------

function parseLine(raw) {
  const line = raw.trim().replace(/[\u3000]/g, ' ').replace(/\s+/g, ' ');
  if (!line) return null;
  let i = line.lastIndexOf('-');
  if (i === -1) i = line.lastIndexOf('－');
  if (i <= 0 || i === line.length - 1) return null;
  const category = line.slice(i + 1).trim();
  const chars = line.slice(0, i).trim().split(' ').filter(Boolean);
  if (!category || chars.length !== 4) return null;
  return { category: category, items: chars };
}

function validatePuzzle(p) {
  const errs = [];
  const items = p.items;
  if (!Array.isArray(items) || items.length !== 16) {
    errs.push('items 必须是 16 个汉字');
  } else {
    const s = new Set();
    for (const it of items) {
      if (typeof it !== 'string' || it.length === 0) { errs.push('items 中存在空值或非字符串'); break; }
      if (s.has(it)) { errs.push('items 中存在重复的汉字：' + it); break; }
      s.add(it);
    }
  }
  if (!Array.isArray(p.groups) || p.groups.length !== 4) {
    errs.push('必须是 4 组');
    return errs;
  }
  for (let i = 0; i < p.groups.length; i++) {
    const g = p.groups[i];
    if (!g || !g.category) { errs.push('第 ' + (i + 1) + ' 行缺少类别'); continue; }
    if (!Array.isArray(g.items) || g.items.length !== 4) errs.push('第 ' + (i + 1) + ' 行必须是 4 个字');
  }
  return errs;
}

// ---------- 菜单动作 ----------

function showAll() {
  if (!list.length) { console.log('  （题库为空）'); return; }
  list.slice().sort(byDate).forEach(function (p, i) {
    console.log('  [' + (i + 1) + '] ' + p.date + '  （' + p.items.length + ' 字 / ' + p.groups.length + ' 组）');
    p.groups.forEach(function (g) {
      console.log('        ' + (g.color ? '[' + g.color + '] ' : '') + g.category + '：' + g.items.join(' '));
    });
  });
}

function printMenu() {
  console.log('');
  console.log('='.repeat(58));
  console.log(' 汉字联系 · 题目编辑（控制台版）');
  console.log(' 固定编辑：' + FILE);
  console.log('='.repeat(58));
  if (loadWarn) console.log(' ' + loadWarn);
  if (list.length) {
    list.slice().sort(byDate).forEach(function (p, i) {
      console.log('  [' + (i + 1) + '] ' + p.date + '  （' + p.groups.length + ' 组 / ' + p.items.length + ' 字）');
    });
  } else {
    console.log(' （题库为空）');
  }
  console.log('');
  console.log(' 操作： 1 查看全部题目   2 添加或替换题目   3 删除题目   4 退出');
}

function addFlow(ask, guard) {
  return (async function () {
    let v = await ask('日期（YYYY-MM-DD，回车=今天 ' + todayStr() + '）: ');
    guard(v);
    const date = (v.trim() || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.log('  日期格式不对（要 YYYY-MM-DD），本次取消'); return; }
    const groups = [];
    for (let i = 1; i <= 4; i++) {
      v = await ask(i + ' 行（4 个字-类别，如：新 桂 吉 宁-省份简称）: ');
      guard(v);
      const g = parseLine(v);
      if (!g) { console.log('  第 ' + i + ' 行格式不对（要「4 个字-类别」，字间用空格），本次取消'); return; }
      groups.push(g);
    }
    const puzzle = { date: date, items: [], groups: [] };
    groups.forEach(function (g, i) {
      puzzle.groups.push({ category: g.category, items: g.items, color: GROUP_COLORS[i] });
      puzzle.items.push.apply(puzzle.items, g.items);
    });
    const errs = validatePuzzle(puzzle);
    if (errs.length) { console.log('  校验失败：' + errs.join('；') + '，本次取消'); return; }
    const idx = list.findIndex(function (p) { return p.date === date; });
    if (idx >= 0) {
      console.log('  该日期已有题目，将替换');
      list[idx] = puzzle;
    } else {
      list.push(puzzle);
    }
    doSave('：' + date);
  })();
}

function delFlow(ask, guard) {
  return (async function () {
    if (!list.length) { console.log('  没有可删除的题目'); return; }
    let v = await ask('要删除哪条？输入编号或日期: ');
    guard(v);
    const sel = v.trim();
    let idx = -1;
    const sorted = list.slice().sort(byDate);
    if (/^\d+$/.test(sel)) {
      const n = parseInt(sel, 10);
      if (n >= 1 && n <= sorted.length) idx = list.indexOf(sorted[n - 1]);
    }
    if (idx === -1) {
      idx = list.findIndex(function (p) { return p.date === sel; });
    }
    if (idx === -1) { console.log('  未找到该题目'); return; }
    const target = list[idx];
    v = await ask('确认删除 ' + target.date + ' 的题目？(回车=确认 / q=取消)');
    guard(v);
    if (v.trim().toLowerCase() === 'q' || v.trim() === '取消') { console.log('  已取消'); return; }
    list.splice(idx, 1);
    doSave('（已删除 ' + target.date + '）');
  })();
}

// ---------- 主循环 ----------

function cleanupTmp() {
  try { fs.unlinkSync(TMP); } catch (_) { /* 忽略 */ }
}

process.on('SIGINT', function () { console.log('\n已退出（未保存的改动已丢弃）。'); cleanupTmp(); process.exit(0); });

(function main() {
  load();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdout.isTTY === true });

  // 自维护行队列：交互式（一行一行输入）与管道/重定向（一次读入多行）都兼容
  const lineQueue = [];
  const waiters = [];
  let eof = false;
  rl.on('line', function (line) {
    if (waiters.length) { waiters.shift()(line); }
    else { lineQueue.push(line); }
  });
  rl.on('close', function () {
    eof = true;
    cleanupTmp();
    while (waiters.length) { waiters.shift()(null); }
  });

  function ask(q) {
    if (eof) { process.stdout.write(q); return Promise.resolve(null); }
    process.stdout.write(q);
    if (lineQueue.length) { return Promise.resolve(lineQueue.shift()); }
    return new Promise(function (res) { waiters.push(res); });
  }
  // 输入行是 null（EOF）时，让流程安静退出
  function guard(v) {
    if (v === null) { console.log('\n（输入已结束）'); process.exit(0); }
  }

  (async function loop() {
    for (;;) {
      printMenu();
      let choice = await ask('> ');
      guard(choice);
      choice = choice.trim().toLowerCase();
      if (choice === '1' || choice === '查看') { showAll(); }
      else if (choice === '2' || choice === '添加') { await addFlow(ask, guard); }
      else if (choice === '3' || choice === '删除') { await delFlow(ask, guard); }
      else if (choice === '4' || choice === 'q' || choice === '退出' || choice === 'x') {
        console.log('已退出。');
        rl.close();
        return;
      }
      else { console.log('  请输入 1~4'); }
    }
  })();
})();
