#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
汉字联系 · 题目编辑器（图形界面版）

固定编辑【本脚本所在目录】下的 puzzles.js —— 没有文件选择框，不会碰其他文件。
用法：双击同目录的「编辑题目.bat」

安全机制（与之前一致）：
  - 覆盖前把旧版备份到 puzzles.bak.js
  - 先写临时文件 → 读回校验 → 原子替换 → 再读回校验
  - puzzles.js 为空 / 损坏时给出明确警告，损坏文件先备份
"""
import calendar as _calmod
import datetime as _dt
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import tkinter as tk
from datetime import date
from tkinter import ttk, messagebox

BASE = os.path.dirname(os.path.abspath(__file__))
GROUP_COLORS = ['yellow', 'green', 'blue', 'purple']  # 按 1~4 行顺序分配

# 三个题库：单字 / 二字 / 四字，分别对应不同的数据文件
MODES = {
    '单字': ('puzzles.js', 'PUZZLES', 1),
    '二字': ('puzzles-2zi.js', 'PUZZLES_2ZI', 2),
    '四字': ('puzzles-4zi.js', 'PUZZLES_4ZI', 4),
}
MODE_ORDER = ['单字', '二字', '四字']

# 当前题库（切换时更新）
FILE = os.path.join(BASE, 'puzzles.js')
BAK = os.path.join(BASE, 'puzzles.bak.js')
TMP = os.path.join(BASE, 'puzzles.tmp.js')
MODE_LEN = 1  # 当前模式下每个词应占的字数
MODE_VAR = 'PUZZLES'  # 当前题库的 JS 变量名
MODE_NAME = '单字'  # 当前题库名


def set_mode(name):
    """切换到指定题库（单字/二字/四字）→ 指向对应的数据文件"""
    global FILE, BAK, TMP, MODE_LEN, MODE_VAR, MODE_NAME
    fname, var, length = MODES[name]
    FILE = os.path.join(BASE, fname)
    BAK = os.path.join(BASE, fname[:-3] + '.bak.js')
    TMP = os.path.join(BASE, fname[:-3] + '.tmp.js')
    MODE_LEN = length
    MODE_VAR = var
    MODE_NAME = name


# ---------- 文件读写 / 校验（纯逻辑，可单独测试） ----------

def extract_puzzles(raw):
    """从 puzzles.js 文本中解析出题目列表。
    返回 (list, error)。error 非 None 表示无法解析（文件损坏等）。"""
    if raw is None:
        return [], '文件不存在'
    text = raw.strip()
    if not text:
        return [], None  # 空文件：不算损坏，单独提示
    idx = text.find('window.PUZZLES')
    if idx == -1:
        return [], '未找到 window.PUZZLES'
    # 找到赋值后的第一个 '['，做括号配对（考虑字符串内部）
    start = text.find('[', idx)
    if start == -1:
        return [], '未找到数组'
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    arr = text[start:i + 1]
                    try:
                        data = json.loads(arr)
                    except Exception as e:
                        return [], 'JSON 解析失败：' + str(e)
                    if not isinstance(data, list):
                        return [], 'PUZZLES 不是数组'
                    out = []
                    for p in data:
                        if (isinstance(p, dict) and isinstance(p.get('date'), str)
                                and isinstance(p.get('items'), list)
                                and isinstance(p.get('groups'), list)):
                            out.append(p)
                    return out, None
    return [], '括号不配对'


def load_state():
    """读取当前题库文件，返回 (dict{date: puzzle}, warn, raw)"""
    fname = os.path.basename(FILE)
    raw = ''
    if not os.path.exists(FILE):
        return {}, '%s 尚不存在（保存后会自动创建）' % fname, ''
    with open(FILE, encoding='utf-8') as f:
        raw = f.read()
    if not raw.strip():
        return {}, '警告：%s 是空文件（可能上次保存出了问题）' % fname, raw
    puzzles, err = extract_puzzles(raw)
    if err:
        try:
            with open(BAK, 'w', encoding='utf-8') as f:
                f.write(raw)
        except OSError:
            pass
        return {}, '警告：%s 内容解析失败（文件可能损坏）。原文件已备份到 %s。' % (
            fname, os.path.basename(BAK)), raw
    d = {}
    for p in puzzles:
        d[p['date']] = p
    return d, None, raw


def build_js(puzzles_list):
    fname = os.path.basename(FILE)
    word = {1: '汉字', 2: '二字词', 4: '四字词'}[MODE_LEN]
    sorted_list = sorted(puzzles_list, key=lambda p: p['date'])
    lines = [
        '// 题目数据由出题人填写，代码只读取，不做任何判断。',
        'window.%s = ' % MODE_VAR + json.dumps(sorted_list, ensure_ascii=False, indent=2) + ';',
        '',
        '// 数据格式（每条题目）：',
        '// {',
        '//   date: string，格式 "YYYY-MM-DD"',
        '//   items: string[16]，16 个不重复的%s' % word,
        '//   groups: Array<{ category: string, items: string[4], color?: "yellow" | "green" | "blue" | "purple" }>，4 组，每组 4 个',
        '// }',
        '// category 完全由出题人填写，代码只负责显示。',
        '// color 可选，只用于已解出组和结算面板的样式。',
        '',
    ]
    return '\n'.join(lines)


def save_to_file(puzzles_list, raw_old):
    """备份 → 写临时 → 校验 → 原子替换 → 再校验。成功返回新 raw，失败抛异常。"""
    if raw_old and raw_old.strip():
        with open(BAK, 'w', encoding='utf-8') as f:
            f.write(raw_old)
    text = build_js(puzzles_list)
    with open(TMP, 'w', encoding='utf-8') as f:
        f.write(text)
    with open(TMP, encoding='utf-8') as f:
        chk = f.read()
    if not chk or 'window.PUZZLES' not in chk:
        try:
            os.remove(TMP)
        except OSError:
            pass
        raise RuntimeError('写入校验失败：临时文件为空')
    os.replace(TMP, FILE)
    with open(FILE, encoding='utf-8') as f:
        final = f.read()
    if not final or 'window.PUZZLES' not in final:
        raise RuntimeError('写入校验失败：保存后的文件为空')
    return final


def parse_line(raw):
    s = raw.strip().replace('\u3000', ' ')
    s = re.sub(r'\s+', ' ', s)
    if not s:
        return None
    i = s.rfind('-')
    if i == -1:
        i = s.rfind('－')
    if i <= 0 or i == len(s) - 1:
        return None
    category = s[i + 1:].strip()
    chars = s[:i].strip().split(' ')
    if not category or len(chars) != 4:
        return None
    return {'category': category, 'items': chars}


def make_puzzle(date_str, lines):
    groups = []
    for i, raw in enumerate(lines):
        g = parse_line(raw)
        if g is None:
            return None, '第 %d 行格式不对（要「4 个词-类别」，词间用空格）' % (i + 1)
        for ch in g['items']:
            if len(ch) != MODE_LEN:
                return None, '第 %d 行「%s」应为 %d 个字（当前题库：%s）' % (
                    i + 1, ch, MODE_LEN, {1: '单字', 2: '二字', 4: '四字'}[MODE_LEN])
        groups.append({'category': g['category'], 'items': g['items'], 'color': GROUP_COLORS[i]})
    puzzle = {'date': date_str, 'items': [], 'groups': groups}
    for g in groups:
        puzzle['items'].extend(g['items'])
    return puzzle, None


def validate_puzzle(p):
    errs = []
    items = p.get('items')
    if not isinstance(items, list) or len(items) != 16:
        errs.append('items 必须是 16 个汉字')
    else:
        seen = set()
        for it in items:
            if not isinstance(it, str) or not it:
                errs.append('items 中存在空值或非字符串')
                break
            if it in seen:
                errs.append('items 中存在重复的汉字：%s' % it)
                break
            seen.add(it)
    groups = p.get('groups')
    if not isinstance(groups, list) or len(groups) != 4:
        errs.append('必须是 4 组')
        return errs
    for i, g in enumerate(groups):
        if not isinstance(g, dict) or not g.get('category'):
            errs.append('第 %d 行缺少类别' % (i + 1))
            continue
        if not isinstance(g.get('items'), list) or len(g['items']) != 4:
            errs.append('第 %d 行必须是 4 个字' % (i + 1))
    return errs


def puzzle_to_text(p):
    return '\n'.join('%s-%s' % (' '.join(g['items']), g['category']) for g in p['groups'])


# ---------- 日历控件 ----------

class MiniCalendar(tk.Frame):
    """简单的月视图日历：上下月切换 + 点击选日。"""

    def __init__(self, master, on_pick, initial=None):
        super().__init__(master)
        self.on_pick = on_pick
        today = initial or date.today()
        self.year, self.month = today.year, today.month
        self.selected = None
        self._render()

    def _prev(self):
        self.month -= 1
        if self.month < 1:
            self.month = 12
            self.year -= 1
        self._render()

    def _next(self):
        self.month += 1
        if self.month > 12:
            self.month = 1
            self.year += 1
        self._render()

    def set_month(self, year, month):
        self.year, self.month = year, month
        self._render()

    def _pick(self, dt):
        self.selected = dt
        self._render()
        if self.on_pick:
            self.on_pick(dt)

    def _render(self):
        for w in self.winfo_children():
            w.destroy()
        ttk.Button(self, text='«', width=3, command=self._prev).grid(row=0, column=0, sticky='w')
        ttk.Label(self, text='%d 年 %d 月' % (self.year, self.month), width=12).grid(row=0, column=1)
        ttk.Button(self, text='»', width=3, command=self._next).grid(row=0, column=2, sticky='e')
        for j, wd in enumerate('日一二三四五六'):
            ttk.Label(self, text=wd, width=3).grid(row=1, column=j)
        first = date(self.year, self.month, 1)
        offset = (first.weekday() + 6) % 7  # 周日开头
        ndays = _calmod.monthrange(self.year, self.month)[1]
        d = 1
        for r in range(6):
            for c in range(7):
                k = r * 7 + c
                if k < offset or d > ndays:
                    ttk.Label(self, text='', width=3).grid(row=2 + r, column=c)
                    continue
                dt = date(self.year, self.month, d)
                d += 1
                style = 'CalSel.TButton' if dt == self.selected else 'CalDay.TButton'
                btn = ttk.Button(self, text=str(dt.day), width=3, style=style,
                                 command=lambda dt=dt: self._pick(dt))
                btn.grid(row=2 + r, column=c)


# ---------- 主窗口 ----------

class EditorApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('汉字联系 · 题目编辑')
        self.root.resizable(False, False)

        style = ttk.Style(self.root)
        try:
            style.configure('CalDay.TButton', padding=2)
            style.configure('CalSel.TButton', padding=2, background='#ffe08a')
            style.map('CalSel.TButton', background=[('active', '#ffd25f')])
        except tk.TclError:
            pass

        self.puzzles = {}
        self.warn = None
        self.raw = ''
        self._reload()

        self._build_ui()
        self.cal._pick(date.today())  # 默认载入今天的题目

    def _build_ui(self):
        r = self.root
        top = ttk.Frame(r, padding=8)
        top.pack(fill='x')
        ttk.Label(top, text='汉字联系 · 题目编辑', font=('Microsoft YaHei', 13, 'bold')).pack(anchor='w')
        self.file_label = ttk.Label(top, text='文件（固定）：' + FILE, foreground='#666')
        self.file_label.pack(anchor='w')

        # 题库选择：单字 / 二字 / 四字（三个独立数据库）
        mode_row = ttk.Frame(r, padding=(10, 0, 8, 0))
        mode_row.pack(fill='x')
        ttk.Label(mode_row, text='题库：').pack(side='left')
        self.mode_var = tk.StringVar(value='单字')
        for name in MODE_ORDER:
            ttk.Radiobutton(mode_row, text=name, value=name, variable=self.mode_var,
                            command=self._on_mode_change).pack(side='left', padx=(6, 0))

        mid = ttk.Frame(r, padding=(8, 4))
        mid.pack(fill='x')
        self.cal = MiniCalendar(mid, on_pick=self._on_pick)
        self.cal.pack(anchor='w')
        self.date_var = tk.StringVar(value='')
        ttk.Label(mid, textvariable=self.date_var, font=('Microsoft YaHei', 11, 'bold')).pack(anchor='w', pady=(4, 0))

        self.txt_frame = ttk.LabelFrame(r, text='题目内容（4 行：每行「4 个词-类别」，回车只是换行）', padding=6)
        self.txt_frame.pack(fill='both', expand=True, padx=8, pady=4)
        self.text = tk.Text(self.txt_frame, height=6, width=36, font=('Microsoft YaHei', 11))
        self.text.pack(fill='both', expand=True)

        btns = ttk.Frame(r, padding=(8, 4))
        btns.pack(fill='x')
        ttk.Button(btns, text='保存（添加 / 替换该日期题目）', command=self.on_save).pack(side='left')
        ttk.Button(btns, text='删除该日期题目', command=self.on_delete).pack(side='left', padx=(8, 0))
        self.push_btn = ttk.Button(btns, text='推送到 GitHub', command=self.on_push)
        self.push_btn.pack(side='right')
        self.sync_btn = ttk.Button(btns, text='同步到小程序', command=self.on_sync_mp)
        self.sync_btn.pack(side='right', padx=(0, 8))

        self.status = tk.StringVar(value=self.warn or '就绪')
        self.status_lbl = ttk.Label(r, textvariable=self.status, anchor='w', foreground='#0a600a', padding=(10, 4))
        self.status_lbl.pack(fill='x')

    def _reload(self):
        self.puzzles, self.warn, self.raw = load_state()

    def _set_status(self, msg, ok=True):
        self.status.set(msg)
        self.status_lbl.config(foreground='#0a600a' if ok else '#c0392b')

    def _on_mode_change(self):
        """切换题库：单字/二字/四字 → 对应的数据文件"""
        name = self.mode_var.get()
        set_mode(name)
        self.file_label.config(text='文件（固定）：' + FILE)
        self.txt_frame.config(text='题目内容（4 行：每行「4 个%s词-类别」，回车只是换行）' % name[:2])
        self._reload()
        self.text.delete('1.0', 'end')
        ds = self.date_var.get()
        if ds:
            try:
                self._on_pick(date.fromisoformat(ds))
                return
            except ValueError:
                pass
        self._set_status('已切换到%s题库，当前 0 条' % name if not self.puzzles
                         else '已切换到%s题库，当前 %d 条' % (name, len(self.puzzles)), True)

    def _on_pick(self, dt):
        ds = dt.isoformat()
        self.date_var.set(ds)
        p = self.puzzles.get(ds)
        self.text.delete('1.0', 'end')
        if p:
            self.text.insert('1.0', puzzle_to_text(p))
            self._set_status('已载入 %s 的题目，改好后点「保存」。' % ds, True)
        else:
            self._set_status('%s 暂无题目，可直接输入 4 行后点「保存」。' % ds, True)

    def on_save(self):
        ds = self.date_var.get()
        if not ds:
            self._set_status('请先在日历上选择日期', ok=False)
            return
        lines = [l for l in self.text.get('1.0', 'end').split('\n') if l.strip()]
        if len(lines) != 4:
            self._set_status('需要正好 4 行（当前 %d 行）' % len(lines), ok=False)
            return
        puzzle, err = make_puzzle(ds, lines)
        if err:
            self._set_status(err, ok=False)
            return
        errs = validate_puzzle(puzzle)
        if errs:
            self._set_status('校验失败：' + '；'.join(errs), ok=False)
            return
        existed = ds in self.puzzles
        self.puzzles[ds] = puzzle
        try:
            self.raw = save_to_file(list(self.puzzles.values()), self.raw)
        except Exception as e:
            self._set_status('保存失败：%s' % e, ok=False)
            return
        self._set_status('已保存 %s（%s，校验通过），共 %d 条；旧版备份在 puzzles.bak.js'
                         % (ds, '替换' if existed else '新增', len(self.puzzles)), ok=True)

    def on_delete(self):
        ds = self.date_var.get()
        if not ds:
            self._set_status('请先在日历上选择日期', ok=False)
            return
        if ds not in self.puzzles:
            self._set_status('%s 没有题目可删' % ds, ok=False)
            return
        if not messagebox.askyesno('确认删除', '删除 %s 的题目？' % ds):
            return
        del self.puzzles[ds]
        try:
            self.raw = save_to_file(list(self.puzzles.values()), self.raw)
        except Exception as e:
            self._set_status('保存失败：%s' % e, ok=False)
            return
        self.text.delete('1.0', 'end')
        self._set_status('已删除 %s，共 %d 条' % (ds, len(self.puzzles)), ok=True)

    # ---------- 推送到 GitHub（本目录即 git 仓库） ----------

    def _git(self, args, timeout=120):
        return subprocess.run(['git'] + args, cwd=BASE, capture_output=True,
                              encoding='utf-8', errors='replace', timeout=timeout)

    def on_push(self):
        if not os.path.isdir(os.path.join(BASE, '.git')):
            messagebox.showerror('推送失败', '未检测到 git 仓库（%s 下没有 .git 目录）' % BASE)
            return
        self.push_btn.config(state='disabled', text='推送中…')
        self._set_status('正在推送到 GitHub…', True)
        threading.Thread(target=self._push_worker, daemon=True).start()

    def _push_worker(self):
        kind, msg = 'err', ''
        try:
            st = self._git(['status', '--porcelain'], timeout=60)
            if not st.stdout.strip():
                kind, msg = 'info', '没有新的改动可推送（工作区是干净的）。'
                return
            self._git(['add', '-A'], timeout=60)
            ts = _dt.datetime.now().strftime('%Y-%m-%d %H:%M')
            cm = self._git(['commit', '-m', '题目更新 %s' % ts], timeout=60)
            if cm.returncode != 0:
                raise RuntimeError('提交失败：' + (cm.stderr.strip().splitlines()[-1] if cm.stderr.strip() else 'git commit 返回 %d' % cm.returncode))
            first = cm.stdout.strip().splitlines()[0] if cm.stdout.strip() else '已提交'
            ph = self._git(['push', 'origin', 'main'], timeout=180)
            if ph.returncode != 0:
                reason = ph.stderr.strip().splitlines()[-1] if ph.stderr.strip() else 'git push 返回 %d' % ph.returncode
                raise RuntimeError('推送失败：' + reason)
            kind, msg = 'ok', '推送成功！%s\n（GitHub Pages 几分钟内自动更新）' % first
        except subprocess.TimeoutExpired:
            kind, msg = 'err', '推送失败：git 命令超时（网络可能不稳定），请稍后重试。'
        except Exception as e:
            kind, msg = 'err', '推送失败：%s' % e
        self.root.after(0, self._push_done, kind, msg)

    def _push_done(self, kind, msg):
        self.push_btn.config(state='normal', text='推送到 GitHub')
        if kind == 'ok':
            self._set_status(msg.splitlines()[0], True)
            messagebox.showinfo('推送成功', msg)
        elif kind == 'info':
            self._set_status(msg, True)
        else:
            self._set_status(msg, False)
            messagebox.showerror('推送失败', msg)

    # ---------- 同步到小程序（convert.js 生成 data/*.js → 复制到 C:\hanzi-mp） ----------

    MP_DIR = os.path.join('C:', os.sep, 'hanzi-mp')

    def on_sync_mp(self):
        if not os.path.isdir(os.path.join(BASE, 'miniprogram')):
            messagebox.showerror('同步失败', '未找到 miniprogram 目录')
            return
        self.sync_btn.config(state='disabled', text='同步中…')
        self._set_status('正在同步题库到小程序…', True)
        threading.Thread(target=self._sync_mp_worker, daemon=True).start()

    def _sync_mp_worker(self):
        kind, msg = 'err', ''
        try:
            cr = subprocess.run(['node', 'tools/convert.js'], cwd=os.path.join(BASE, 'miniprogram'),
                                 capture_output=True, encoding='utf-8', errors='replace', timeout=60)
            if cr.returncode != 0:
                detail = (cr.stderr or cr.stdout).strip().splitlines()[-1] if (cr.stderr or cr.stdout).strip() else '未知错误'
                raise RuntimeError('convert.js 执行失败：' + detail)
            src = os.path.join(BASE, 'miniprogram')
            os.makedirs(self.MP_DIR, exist_ok=True)
            for name in os.listdir(src):
                if name == 'project.private.config.json':  # 工具本机配置，不覆盖
                    continue
                s = os.path.join(src, name)
                d = os.path.join(self.MP_DIR, name)
                if os.path.isdir(s):
                    shutil.copytree(s, d, dirs_exist_ok=True)
                else:
                    shutil.copy2(s, d)
            kind, msg = 'ok', '同步成功！小程序题库已更新（C:\\hanzi-mp）。\n下一步：微信开发者工具 → 编译 / 预览'
        except subprocess.TimeoutExpired:
            kind, msg = 'err', '同步失败：convert.js 超时，请重试。'
        except Exception as e:
            kind, msg = 'err', '同步失败：%s' % e
        self.root.after(0, self._sync_mp_done, kind, msg)

    def _sync_mp_done(self, kind, msg):
        self.sync_btn.config(state='normal', text='同步到小程序')
        if kind == 'ok':
            self._set_status(msg.splitlines()[0], True)
            messagebox.showinfo('同步成功', msg)
        else:
            self._set_status(msg, False)
            messagebox.showerror('同步失败', msg)

    def run(self):
        self.root.mainloop()


def main():
    app = EditorApp()
    app.run()


if __name__ == '__main__':
    main()
