// 汉字联系 · 页面逻辑（与网页版 app.js 1:1 对应）
const Game = require('../../utils/game.js');

const BOOKS = {
  1: require('../../data/puzzles.js'),
  2: require('../../data/puzzles-2zi.js'),
  4: require('../../data/puzzles-4zi.js'),
};

Page({
  data: {
    // 视图状态
    view: 'select', // select | game | message
    msg: '',
    currentDate: '',
    showDateBtn: true,
    showHelpBtn: true,
    showBackBtn: false,
    selectModes: Game.MODE_ORDER.map((k) => ({ key: k, label: Game.MODES[k].label })),
    // 游戏视图模型（由 syncView 从 this.state 生成）
    mode: 1,
    isTutorial: false,
    hearts: [],
    solvedCards: [],
    resultCards: [],
    remaining: [],
    closeHint: false,
    over: false,
    won: false,
    mistakes: 0,
    canSubmit: false,
    // 自绘日历
    weekChars: ['日', '一', '二', '三', '四', '五', '六'],
    calOpen: false,
    calTitle: '',
    calBlanks: [],
    calDays: [],
    calPrevDisabled: false,
    calNextDisabled: false,
    // 帮助
    helpOpen: false,
    helpIntroSegs: Game.HELP_INTRO_SEGS,
    helpItems: Game.HELP_ITEMS_SEGS,
  },

  // 内部状态（对应网页版模块级变量；Set 不直接进 data，由 syncView 转视图模型）
  state: null,
  currentMode: null, // null = 模式选择页
  calView: null,
  currentDate: '',

  onLoad() {
    this.currentDate = Game.todayString();
    this.setData({ currentDate: this.currentDate });
    this.renderSelect();
  },

  // ---------- 页面切换 ----------

  // 模式选择首页
  renderSelect() {
    this.currentMode = null;
    this.state = null;
    this.setData({
      view: 'select',
      msg: '',
      isTutorial: false,
      over: false,
      won: false,
      mistakes: 0,
      closeHint: false,
      hearts: [],
      solvedCards: [],
      resultCards: [],
      remaining: [],
      canSubmit: false,
      showDateBtn: true,
      showHelpBtn: true,
      showBackBtn: false,
    });
  },

  // 空状态 / 配置错误（网页版 renderMessage：显示返回按钮）
  renderMessage(text) {
    this.setData({
      view: 'message',
      msg: text,
      showDateBtn: true,
      showHelpBtn: true,
      showBackBtn: true,
    });
  },

  goBack() {
    this.renderSelect();
  },

  // ---------- 开局（网页版 startGame） ----------

  onSelectMode(e) {
    this.startGameWith(e.currentTarget.dataset.mode);
  },

  startGameWith(mode) {
    this.currentMode = mode;

    // 教程例题：固定内容 + 固定种子（每次打开布局都相同）
    if (mode === 'tutorial') {
      const errs = Game.validatePuzzle(Game.TUTORIAL);
      if (errs.length) {
        console.error('教程题配置错误：', errs);
        this.renderMessage('题目配置错误');
        return;
      }
      this.state = {
        mode: 2,
        chars: Game.seededShuffle(Game.TUTORIAL.items, Game.hashString('tutorial')),
        groups: Game.TUTORIAL.groups,
        solved: new Set(),
        selected: new Set(),
        mistakes: 0,
        over: false,
        won: false,
        closeHint: false,
      };
      this.renderGameView();
      return;
    }

    const puzzles = BOOKS[mode];
    if (!Array.isArray(puzzles)) {
      console.error('题目配置错误：题库不是数组');
      this.renderMessage('题目配置错误');
      return;
    }

    let puzzle = null;
    for (const p of puzzles) {
      if (p && p.date === this.currentDate) {
        puzzle = p;
        break;
      }
    }
    if (!puzzle) {
      this.renderMessage(
        this.currentDate === Game.todayString() ? '今日题目尚未配置' : '该日期题目尚未配置'
      );
      return;
    }

    const errs = Game.validatePuzzle(puzzle);
    if (errs.length) {
      console.error('题目配置错误：', errs);
      this.renderMessage('题目配置错误');
      return;
    }

    this.state = {
      mode: mode,
      chars: Game.seededShuffle(puzzle.items, Game.hashString(this.currentDate + '-' + mode)),
      groups: puzzle.groups,
      solved: new Set(),
      selected: new Set(),
      mistakes: 0,
      over: false,
      won: false,
      closeHint: false,
    };
    this.renderGameView();
  },

  // ---------- 游戏视图（网页版 renderGame + renderHearts） ----------

  groupCardVM(g, mode) {
    return {
      category: String(g.category),
      items: g.items,
      color: Game.KNOWN_COLORS.indexOf(g.color) >= 0 ? g.color : '',
      mode: mode,
    };
  },

  renderGameView() {
    this.setData({
      view: 'game',
      isTutorial: this.currentMode === 'tutorial',
      // 教程题与日期无关：隐藏日期按钮；教程里有内嵌帮助：隐藏帮助按钮
      showDateBtn: this.currentMode !== 'tutorial',
      showHelpBtn: this.currentMode !== 'tutorial',
      showBackBtn: true,
      mode: this.state.mode,
    });
    this.syncView();
  },

  syncView() {
    const s = this.state;
    // 扣心 = 直接减少颗数（始终显示红心）
    const livesLeft = Game.MAX_MISTAKES - s.mistakes;
    const hearts = [];
    for (let i = 0; i < livesLeft; i++) hearts.push('❤️');

    // 已解出的组（显示在网格上方；结束后由结算面板统一展示）
    const solvedCards = [];
    if (!s.over) {
      s.groups.forEach((g, i) => {
        if (s.solved.has(i)) solvedCards.push(this.groupCardVM(g, s.mode));
      });
    }

    // 剩余未解出的字/词（保持打乱后的原顺序）
    const solvedChars = new Set();
    s.groups.forEach((g, i) => {
      if (s.solved.has(i)) g.items.forEach((ch) => solvedChars.add(ch));
    });
    const remaining = s.chars
      .filter((ch) => !solvedChars.has(ch))
      .map((ch) => ({ ch: ch, selected: s.selected.has(ch) }));

    // 结算面板：结束后公布全部答案
    const resultCards = s.over
      ? s.groups.map((g) => this.groupCardVM(g, s.mode))
      : [];

    this.setData({
      hearts: hearts,
      solvedCards: solvedCards,
      remaining: remaining,
      resultCards: resultCards,
      closeHint: s.closeHint,
      over: s.over,
      won: s.won,
      mistakes: s.mistakes,
      canSubmit: !s.over && s.selected.size === 4,
    });
  },

  // ---------- 交互（网页版 onTileClick / onShuffle / onSubmit） ----------

  onTileTap(e) {
    const ch = e.currentTarget.dataset.ch;
    const state = this.state;
    if (state.over) return;
    state.closeHint = false;
    if (state.selected.has(ch)) {
      state.selected.delete(ch);
    } else if (state.selected.size < 4) {
      state.selected.add(ch);
    }
    this.syncView();
  },

  onShuffle() {
    const state = this.state;
    if (state.over) return;
    state.selected.clear();
    state.closeHint = false;

    // 只打乱未解出的字，已解出的组不动
    const solvedChars = new Set();
    state.groups.forEach((g, i) => {
      if (state.solved.has(i)) g.items.forEach((ch) => solvedChars.add(ch));
    });
    const unsolved = state.chars.filter((ch) => !solvedChars.has(ch));
    for (let i = unsolved.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = unsolved[i];
      unsolved[i] = unsolved[j];
      unsolved[j] = tmp;
    }
    let k = 0;
    state.chars = state.chars.map((ch) => (solvedChars.has(ch) ? ch : unsolved[k++]));
    this.syncView();
  },

  onSubmit() {
    const state = this.state;
    if (state.over || state.selected.size !== 4) return;

    // 判题：只比较选中的 4 个字是否与某一组 items 完全一致
    const sel = Array.from(state.selected).sort().join('');
    let matched = -1;
    for (let i = 0; i < state.groups.length; i++) {
      if (state.solved.has(i)) continue;
      if (state.groups[i].items.slice().sort().join('') === sel) {
        matched = i;
        break;
      }
    }

    if (matched >= 0) {
      state.solved.add(matched);
      state.selected.clear();
      state.closeHint = false;
      if (state.solved.size === state.groups.length) {
        state.over = true;
        state.won = true;
      }
    } else {
      // 差一点：选中的 4 个字与某个未解出组有 3 个相同（不提示是哪一组、哪个字）
      state.closeHint = false;
      for (let i = 0; i < state.groups.length; i++) {
        if (state.solved.has(i)) continue;
        let hit = 0;
        for (const ch of state.groups[i].items) {
          if (state.selected.has(ch)) hit++;
        }
        if (hit === 3) {
          state.closeHint = true;
          break;
        }
      }
      state.mistakes += 1;
      state.selected.clear();
      if (state.mistakes >= Game.MAX_MISTAKES) {
        state.over = true;
      }
    }
    this.syncView();
  },

  // ---------- 自绘日历（与网页版 renderCalendar / selectDate 一致） ----------

  openCalendar() {
    // 教程题与日期无关：直接拒绝打开
    if (this.currentMode === 'tutorial') return;
    this.calView = {
      y: +this.currentDate.slice(0, 4),
      m: +this.currentDate.slice(5, 7),
    };
    this.setData({ calOpen: true });
    this.renderCalendar();
  },

  renderCalendar() {
    // 游戏内：只算当前题库；选择页：三个并集；教程：日期无关，用并集占位
    const mode = this.currentMode === 'tutorial' ? null : this.currentMode;
    const y = this.calView.y;
    const m = this.calView.m;
    const today = Game.todayString();

    // 翻页：目标月没有任何可选日期（含未来月）→ 按钮禁用
    const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    const prevDisabled = Game.monthSelectableCount(py, pm, mode, BOOKS) === 0;
    const nextDisabled = Game.monthSelectableCount(ny, nm, mode, BOOKS) === 0;

    const dim = new Date(y, m, 0).getDate();
    const firstOffset = new Date(y, m - 1, 1).getDay(); // 周日起始
    const pad = (x) => String(x).padStart(2, '0');
    const days = [];
    for (let d = 1; d <= dim; d++) {
      const key = y + '-' + pad(m) + '-' + pad(d);
      const ok = Game.dayEligible(key, mode, BOOKS);
      days.push({
        key: key,
        d: d,
        ok: ok,
        sel: key === this.currentDate,
        today: key === today,
      });
    }

    this.setData({
      calTitle: y + ' 年 ' + m + ' 月',
      calBlanks: new Array(firstOffset).fill(0),
      calDays: days,
      calPrevDisabled: prevDisabled,
      calNextDisabled: nextDisabled,
    });
  },

  onCalPrev() {
    if (this.data.calPrevDisabled) return;
    if (this.calView.m === 1) {
      this.calView.m = 12;
      this.calView.y -= 1;
    } else {
      this.calView.m -= 1;
    }
    this.renderCalendar();
  },

  onCalNext() {
    if (this.data.calNextDisabled) return;
    if (this.calView.m === 12) {
      this.calView.m = 1;
      this.calView.y += 1;
    } else {
      this.calView.m += 1;
    }
    this.renderCalendar();
  },

  onCalClose() {
    this.setData({ calOpen: false });
  },

  onCalOverlayTap() {
    this.setData({ calOpen: false });
  },

  onSelectDate(e) {
    const s = e.currentTarget.dataset.d;
    if (!s) return;
    this.currentDate = s;
    this.setData({ currentDate: s, calOpen: false });
    if (this.currentMode) this.startGameWith(this.currentMode);
    // 选择页：只换日期（顶部按钮已更新），等用户再选模式
  },

  // ---------- 帮助小窗（与网页版一致） ----------

  openHelp() {
    if (this.currentMode === 'tutorial') return; // 教程里有内嵌帮助，无需弹窗
    this.setData({ helpOpen: true });
  },

  onHelpClose() {
    this.setData({ helpOpen: false });
  },

  onHelpOverlayTap() {
    this.setData({ helpOpen: false });
  },

  noop() {},
});
