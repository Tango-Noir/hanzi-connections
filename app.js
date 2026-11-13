(function () {
  'use strict';

  const MAX_MISTAKES = 4;
  const KNOWN_COLORS = ['yellow', 'green', 'blue', 'purple'];

  // 三种挑战：单字 / 二字 / 四字
  const MODES = {
    1: { label: '单字', varName: 'PUZZLES' },
    2: { label: '二字', varName: 'PUZZLES_2ZI' },
    4: { label: '四字', varName: 'PUZZLES_4ZI' },
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

  const stage = document.getElementById('stage');
  const statusEl = document.getElementById('status');
  const backBtn = document.getElementById('back-btn');
  const dateBtn = document.getElementById('date-btn');
  const calOverlay = document.getElementById('cal-overlay');
  const calGrid = document.getElementById('cal-grid');
  const calTitle = document.getElementById('cal-title');
  const calPrev = document.getElementById('cal-prev');
  const calNext = document.getElementById('cal-next');
  const calClose = document.getElementById('cal-close');

  let currentDate = todayString();
  dateBtn.textContent = '📅 ' + currentDate;

  // ---------- 本地日期 ----------

  function todayString() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // ---------- 自绘日历（只有有题的日期可点；整月无题不可翻到；未来日期不可点） ----------

  let calView = null; // 当前显示的月份 { y, m }

  function hasPuzzleOn(dstr, mode) {
    const lists = mode
      ? [window[MODES[mode].varName]]
      : MODE_ORDER.map((k) => window[MODES[k].varName]);
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        if (p && p.date === dstr) return true;
      }
    }
    return false;
  }

  // 可选条件：今天或之前 且 有题目（选择页取三个题库的并集）
  function dayEligible(dstr, mode) {
    return dstr <= todayString() && hasPuzzleOn(dstr, mode);
  }

  function monthSelectableCount(y, m, mode) {
    const dim = new Date(y, m, 0).getDate();
    let n = 0;
    const pad = (x) => String(x).padStart(2, '0');
    for (let d = 1; d <= dim; d++) {
      if (dayEligible(y + '-' + pad(m) + '-' + pad(d), mode)) n++;
    }
    return n;
  }

  function renderCalendar() {
    // 游戏内：只算当前题库；选择页：三个并集；教程：日期无关，用并集占位
    const mode = currentMode === 'tutorial' ? null : currentMode;
    const { y, m } = calView;
    const today = todayString();
    calTitle.textContent = y + ' 年 ' + m + ' 月';

    // 翻页：目标月没有任何可选日期（含未来月）→ 按钮禁用
    const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    calPrev.disabled = monthSelectableCount(py, pm, mode) === 0;
    calNext.disabled = monthSelectableCount(ny, nm, mode) === 0;

    calGrid.innerHTML = '';
    for (const wd of '日一二三四五六') {
      const h = document.createElement('span');
      h.className = 'cal-wd';
      h.textContent = wd;
      calGrid.appendChild(h);
    }
    const dim = new Date(y, m, 0).getDate();
    const firstOffset = new Date(y, m - 1, 1).getDay(); // 周日起始
    for (let i = 0; i < firstOffset; i++) {
      const blank = document.createElement('span');
      blank.className = 'cal-blank';
      calGrid.appendChild(blank);
    }
    for (let d = 1; d <= dim; d++) {
      const s = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const cell = document.createElement('button');
      cell.type = 'button';
      const ok = dayEligible(s, mode);
      cell.className = 'cal-day'
        + (ok ? ' on' : ' off')
        + (s === currentDate ? ' sel' : '')
        + (s === today ? ' today' : '');
      cell.textContent = d;
      if (ok) {
        cell.addEventListener('click', () => selectDate(s));
      } else {
        cell.disabled = true;
      }
      calGrid.appendChild(cell);
    }
  }

  function selectDate(s) {
    currentDate = s;
    dateBtn.textContent = '📅 ' + s;
    calOverlay.style.display = 'none';
    if (currentMode) startGame(currentMode);
    // 选择页：只换日期（顶部按钮已更新），等用户再选模式
  }

  function openCalendar() {
    // 教程题与日期无关：直接拒绝打开
    if (currentMode === 'tutorial') return;
    calView = { y: +currentDate.slice(0, 4), m: +currentDate.slice(5, 7) };
    renderCalendar();
    calOverlay.style.display = 'block';
  }

  function closeCalendar() {
    calOverlay.style.display = 'none';
  }

  dateBtn.addEventListener('click', openCalendar);
  calPrev.addEventListener('click', () => {
    if (calView.m === 1) { calView.m = 12; calView.y -= 1; } else { calView.m -= 1; }
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    if (calView.m === 12) { calView.m = 1; calView.y += 1; } else { calView.m += 1; }
    renderCalendar();
  });
  calClose.addEventListener('click', closeCalendar);
  calOverlay.addEventListener('click', (e) => {
    if (e.target === calOverlay) closeCalendar();
  });

  // ---------- 按日期种子的确定性洗牌 ----------

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

  // ---------- 结构校验（不做语义校验） ----------

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

  // ---------- 页面渲染 ----------

  function buildGroupCard(group, mode) {
    const card = document.createElement('div');
    const colorCls = KNOWN_COLORS.indexOf(group.color) >= 0 ? ' ' + group.color : '';
    card.className = 'group-card m' + mode + colorCls;

    const cat = document.createElement('div');
    cat.className = 'group-category';
    cat.textContent = String(group.category);

    const row = document.createElement('div');
    row.className = 'group-items';
    for (const ch of group.items) {
      const span = document.createElement('span');
      span.textContent = ch;
      row.appendChild(span);
    }

    card.appendChild(cat);
    card.appendChild(row);
    return card;
  }

  function renderMessage(text) {
    stage.innerHTML = '';
    statusEl.textContent = '';
    backBtn.style.display = 'block';
    const box = document.createElement('div');
    box.className = 'message-box';
    const p = document.createElement('p');
    p.textContent = text;
    box.appendChild(p);
    stage.appendChild(box);
  }

  // 模式选择首页
  function renderSelect() {
    currentMode = null;
    stage.innerHTML = '';
    statusEl.textContent = '';
    backBtn.style.display = 'none';
    dateBtn.style.display = 'block';

    const box = document.createElement('div');
    box.className = 'select';
    for (const key of MODE_ORDER) {
      const m = MODES[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'select-btn';
      const title = document.createElement('span');
      title.className = 'select-title';
      title.textContent = m.label;
      btn.appendChild(title);
      btn.addEventListener('click', () => startGame(key));
      box.appendChild(btn);
    }
    const tutBtn = document.createElement('button');
    tutBtn.type = 'button';
    tutBtn.className = 'select-btn tutorial';
    const tutTitle = document.createElement('span');
    tutTitle.className = 'select-title';
    tutTitle.textContent = '教程';
    tutBtn.appendChild(tutTitle);
    tutBtn.addEventListener('click', () => startGame('tutorial'));
    box.appendChild(tutBtn);
    stage.appendChild(box);
  }

  function renderHearts(state) {
    statusEl.textContent = '';
    const row = document.createElement('span');
    row.className = 'hearts';
    // 扣心 = 直接减少颗数（始终显示红心）
    const livesLeft = MAX_MISTAKES - state.mistakes;
    for (let i = 0; i < livesLeft; i++) {
      const h = document.createElement('span');
      h.className = 'heart';
      h.textContent = '\u2764\uFE0F';
      row.appendChild(h);
    }
    statusEl.appendChild(row);
  }

  function renderGame(state) {
    stage.innerHTML = '';
    backBtn.style.display = 'block';
    // 教程题与日期无关：隐藏日期按钮，防止误选日期
    dateBtn.style.display = currentMode === 'tutorial' ? 'none' : 'block';
    renderHearts(state);

    // 已解出的组（显示在网格上方；结束后由结算面板统一展示）
    if (!state.over) {
      const solvedBox = document.createElement('section');
      solvedBox.className = 'solved';
      for (let i = 0; i < state.groups.length; i++) {
        if (!state.solved.has(i)) continue;
        solvedBox.appendChild(buildGroupCard(state.groups[i], state.mode));
      }
      stage.appendChild(solvedBox);
    }

    // 4x4 网格（剩余未解出的字/词，保持打乱后的原顺序）
    const solvedChars = new Set();
    state.groups.forEach((g, i) => {
      if (state.solved.has(i)) g.items.forEach((ch) => solvedChars.add(ch));
    });
    const remaining = state.chars.filter((ch) => !solvedChars.has(ch));
    if (remaining.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'grid m' + state.mode;
      for (const ch of remaining) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tile m' + state.mode + (state.selected.has(ch) ? ' selected' : '');
        btn.textContent = ch;
        btn.disabled = state.over;
        btn.addEventListener('click', () => onTileClick(state, ch));
        grid.appendChild(btn);
      }
      stage.appendChild(grid);
    }

    // “差一点”提示（选错后出现，下次选择或提交时清除）
    if (state.closeHint) {
      const closeHint = document.createElement('p');
      closeHint.className = 'close-hint';
      closeHint.textContent = '差一点';
      stage.appendChild(closeHint);
    }

    // 按钮：提交 / 洗牌
    const controls = document.createElement('div');
    controls.className = 'controls';
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'submit';
    submitBtn.textContent = '提交';
    submitBtn.disabled = state.over || state.selected.size !== 4;
    submitBtn.addEventListener('click', () => onSubmit(state));
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';
    const shuffleBtn = document.createElement('button');
    shuffleBtn.type = 'button';
    shuffleBtn.className = 'btn-secondary';
    shuffleBtn.textContent = '洗牌';
    shuffleBtn.disabled = state.over;
    shuffleBtn.addEventListener('click', () => onShuffle(state));
    btnRow.appendChild(shuffleBtn);
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = '点选 4 个字后提交';
    controls.appendChild(submitBtn);
    controls.appendChild(btnRow);
    controls.appendChild(hint);
    stage.appendChild(controls);

    // 结算面板（直接显示在页面上，不做弹窗）
    if (state.over) {
      const result = document.createElement('section');
      result.className = 'result';
      const title = document.createElement('h2');
      title.textContent = state.won ? '胜利' : '失败';
      const meta = document.createElement('p');
      meta.className = 'result-meta';
      meta.textContent = '错误 ' + state.mistakes + ' 次';
      result.appendChild(title);
      result.appendChild(meta);
      for (let i = 0; i < state.groups.length; i++) {
        result.appendChild(buildGroupCard(state.groups[i], state.mode));
      }
      stage.appendChild(result);
    }
  }

  // ---------- 交互 ----------

  function onTileClick(state, ch) {
    if (state.over) return;
    state.closeHint = false;
    if (state.selected.has(ch)) {
      state.selected.delete(ch);
    } else if (state.selected.size < 4) {
      state.selected.add(ch);
    }
    renderGame(state);
  }

  function onShuffle(state) {
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
    renderGame(state);
  }

  function onSubmit(state) {
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
      if (state.mistakes >= MAX_MISTAKES) {
        state.over = true;
      }
    }
    renderGame(state);
  }

  // ---------- 启动 ----------

  let currentMode = null; // null = 模式选择页

  function startGame(mode) {
    currentMode = mode;

    // 教程例题：固定内容 + 固定种子（每次打开布局都相同）
    if (mode === 'tutorial') {
      const errs = validatePuzzle(TUTORIAL);
      if (errs.length) {
        console.error('教程题配置错误：', errs);
        statusEl.textContent = '';
        renderMessage('题目配置错误');
        return;
      }
      const state = {
        mode: 2,
        chars: seededShuffle(TUTORIAL.items, hashString('tutorial')),
        groups: TUTORIAL.groups,
        solved: new Set(),
        selected: new Set(),
        mistakes: 0,
        over: false,
        won: false,
        closeHint: false,
      };
      renderGame(state);
      return;
    }

    const puzzles = window[MODES[mode].varName];
    if (!Array.isArray(puzzles)) {
      console.error('题目配置错误：window.' + MODES[mode].varName + ' 不是数组');
      statusEl.textContent = '';
      renderMessage('题目配置错误');
      return;
    }

    let puzzle = null;
    for (const p of puzzles) {
      if (p && p.date === currentDate) {
        puzzle = p;
        break;
      }
    }
    if (!puzzle) {
      statusEl.textContent = '';
      renderMessage(
        currentDate === todayString() ? '今日题目尚未配置' : '该日期题目尚未配置'
      );
      return;
    }

    const errs = validatePuzzle(puzzle);
    if (errs.length) {
      console.error('题目配置错误：', errs);
      statusEl.textContent = '';
      renderMessage('题目配置错误');
      return;
    }

    const state = {
      mode: mode,
      chars: seededShuffle(puzzle.items, hashString(currentDate + '-' + mode)),
      groups: puzzle.groups,
      solved: new Set(),
      selected: new Set(),
      mistakes: 0,
      over: false,
      won: false,
      closeHint: false,
    };
    renderGame(state);
  }

  backBtn.addEventListener('click', () => renderSelect());

  // ---------- 帮助小窗 ----------

  const helpBtn = document.getElementById('help-btn');
  const helpOverlay = document.getElementById('help-overlay');
  const helpClose = document.getElementById('help-close');

  helpBtn.addEventListener('click', () => {
    helpOverlay.style.display = 'block';
  });
  helpClose.addEventListener('click', () => {
    helpOverlay.style.display = 'none';
  });
  helpOverlay.addEventListener('click', (e) => {
    if (e.target === helpOverlay) {
      helpOverlay.style.display = 'none';
    }
  });

  renderSelect();
})();
