// 汉字联系 · 纯逻辑模块（与网页版 app.js 的算法 1:1 对应，可单测）
// 网页版 window.PUZZLES / PUZZLES_2ZI / PUZZLES_4ZI → 这里由 books 参数传入

const MAX_MISTAKES = 4;
const KNOWN_COLORS = ['yellow', 'green', 'blue', 'purple'];

const MODES = {
  1: { label: '单字' },
  2: { label: '二字' },
  4: { label: '四字' },
};
const MODE_ORDER = [1, 2, 4];

// 教程例题：固定不变，不存题库
const TUTORIAL = {
  date: 'tutorial',
  items: [
    '一心', '二胡', '三鲜', '四季',
    '树林', '杨柳', '松柏', '桥梁',
    '美丽', '遥远', '清澈', '寒冷',
    '开关', '高低', '长短', '真假',
  ],
  groups: [
    { category: '含数字', items: ['一心', '二胡', '三鲜', '四季'], color: 'yellow' },
    { category: '两个字都带木字旁', items: ['树林', '杨柳', '松柏', '桥梁'], color: 'green' },
    { category: '两个意思相近的字', items: ['美丽', '遥远', '清澈', '寒冷'], color: 'blue' },
    { category: '两个意思相反的字', items: ['开关', '高低', '长短', '真假'], color: 'purple' },
  ],
};

// 帮助文案（WXML 不支持 innerHTML，拆成片段数组；hl = 红色强调）
const HELP_INTRO_SEGS = [
  { t: '把 16 个字或词分成 ' },
  { t: '4 组', hl: true },
  { t: '，每组 ' },
  { t: '4 个', hl: true },
  { t: '。组内的四个字或词存在某种共同联系。' },
];
const HELP_ITEMS_SEGS = [
  [{ t: '点选 4 个字或词后点「提交」，再次点击可取消选中。' }],
  [{ t: '猜对：该组锁定，并显示其中的联系。' }],
  [
    { t: '猜错：扣 1 次机会；' },
    { t: '若其中有 3 个字或词属于同一组，会提示「差一点」', hl: true },
    { t: '。' },
  ],
  [{ t: '共 4 次机会，用完即失败，并公布全部答案。' }],
  [{ t: '「洗牌」只打乱未解出的字或词。' }],
  [{ t: '每天更新一道题。' }],
];

// ---------- 本地日期（与网页版一致） ----------

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

// ---------- 日期可用性（自绘日历的规则，与网页版一致） ----------

// books: {1: [...], 2: [...], 4: [...]}
function hasPuzzleOn(dstr, mode, books) {
  const lists = mode
    ? [books[mode]]
    : [books[1], books[2], books[4]];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (p && p.date === dstr) return true;
    }
  }
  return false;
}

// 可选条件：今天或之前 且 有题目
function dayEligible(dstr, mode, books) {
  return dstr <= todayString() && hasPuzzleOn(dstr, mode, books);
}

// 整月可选日期数（翻页禁用判断用）
function monthSelectableCount(y, m, mode, books) {
  const dim = new Date(y, m, 0).getDate();
  let n = 0;
  const pad = (x) => String(x).padStart(2, '0');
  for (let d = 1; d <= dim; d++) {
    if (dayEligible(y + '-' + pad(m) + '-' + pad(d), mode, books)) n++;
  }
  return n;
}

// ---------- 按日期种子的确定性洗牌（与网页版完全一致） ----------

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// ---------- 结构校验（与网页版一致，不做语义校验） ----------

function validatePuzzle(p) {
  const errs = [];
  if (!p || typeof p !== 'object') return ['题目不是对象'];

  let itemSet = null;
  const items = p.items;
  if (!Array.isArray(items) || items.length !== 16) {
    errs.push('items 必须是 16 个字/词');
  } else {
    const s = new Set();
    let ok = true;
    for (const it of items) {
      if (typeof it !== 'string' || it.length === 0) {
        errs.push('items 中存在空值或非字符串');
        ok = false;
        break;
      }
      if (s.has(it)) {
        errs.push('items 中存在重复的字/词');
        ok = false;
        break;
      }
      s.add(it);
    }
    if (ok) itemSet = s;
  }

  if (!Array.isArray(p.groups) || p.groups.length !== 4) {
    errs.push('groups 必须是 4 组');
    return errs;
  }

  const allGroupItems = [];
  for (let i = 0; i < p.groups.length; i++) {
    const g = p.groups[i];
    if (!g || !Array.isArray(g.items) || g.items.length !== 4) {
      errs.push('第 ' + (i + 1) + ' 组 items 必须是 4 个字/词');
      continue;
    }
    for (const it of g.items) {
      if (typeof it !== 'string' || it.length === 0) {
        errs.push('第 ' + (i + 1) + ' 组 items 中存在空值或非字符串');
      }
    }
    allGroupItems.push(...g.items);
  }
  if (errs.length) return errs;

  if (itemSet) {
    for (const it of allGroupItems) {
      if (!itemSet.has(it)) {
        errs.push('组中的字/词与 items 不一致');
        break;
      }
    }
    if (!errs.length) {
      const covered = new Set(allGroupItems);
      if (covered.size !== 16) {
        errs.push('4 组未覆盖全部 16 个字/词（存在重复或遗漏）');
      }
    }
  }
  return errs;
}

module.exports = {
  MAX_MISTAKES,
  KNOWN_COLORS,
  MODES,
  MODE_ORDER,
  TUTORIAL,
  HELP_INTRO_SEGS,
  HELP_ITEMS_SEGS,
  todayString,
  hasPuzzleOn,
  dayEligible,
  monthSelectableCount,
  hashString,
  mulberry32,
  seededShuffle,
  validatePuzzle,
};
