// ─── STATE ───
let board = Array(9).fill(''), cur = 'X', active = true, hist = [], scores = { X: 0, O: 0, D: 0 };
const TURN_TIME = 12;
let tInt = null, timeLeft = TURN_TIME, timerStarted = false, timerPaused = false;
const WINS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

// ─── ELEMENT REFS ───
const board_el = document.getElementById('board'),
  status_el = document.getElementById('status'),
  scX_el = document.getElementById('sc-x'),
  scO_el = document.getElementById('sc-o'),
  scD_el = document.getElementById('sc-d'),
  lblX_el = document.getElementById('lbl-x'),
  lblO_el = document.getElementById('lbl-o'),
  nx_el = document.getElementById('nx'),
  no_el = document.getElementById('no'),
  tDisp_el = document.getElementById('timer-disp'),
  scheme_el = document.getElementById('scheme'),
  pauseBtn = document.getElementById('btn-pause');

const nameX = () => nx_el.value.trim() || 'Player X';
const nameO = () => no_el.value.trim() || 'Player O';

// ─── BOARD BUILD ───
function build() {
  board_el.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.className = 'cell'; c.dataset.i = i;
    c.addEventListener('click', onClick);
    board_el.appendChild(c);
  }
}

// ─── PAUSED CELL OVERLAY ───
function syncPausedCells() {
  [...board_el.children].forEach(c => {
    if (!c.classList.contains('taken')) {
      c.classList.toggle('paused-cell', timerPaused);
    }
  });
}

// ─── SYNC BUTTON STATES ───
function syncButtonStates() {
  const blocked = timerStarted && timerPaused && active;
  document.getElementById('btn-new').disabled = blocked;
  document.getElementById('btn-undo').disabled = blocked;
  document.getElementById('btn-ai').disabled = blocked;
  document.getElementById('btn-rs').disabled = blocked;
}

// ─── CLICK HANDLER ───
function onClick(e) {
  const i = +e.currentTarget.dataset.i;
  if (board[i] || !active || timerPaused) return;
  move(i);
}

// ─── MOVE ───
function move(i) {
  board[i] = cur; hist.push(i);
  const cell = board_el.children[i];
  cell.classList.add('taken', cur === 'X' ? 'cx-cell' : 'co-cell');
  cell.innerHTML = `<span class="cell-sym">${cur}</span>`;

  if (!timerStarted) {
    beginTurnTimer();
  }

  check();
  saveState();
}

// ─── CHECK WIN / DRAW ───
function check() {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      active = false; stopTimer(); timeLeft = TURN_TIME; updateTimerUI();
      [board_el.children[a], board_el.children[b], board_el.children[c]]
        .forEach(el => el.classList.add('winner'));
      scores[cur]++; bump(cur); syncScores();
      const n = cur === 'X' ? nameX() : nameO();
      setStatus('sw', `🎉 ${n} wins!`);
      saveState(); confetti(); return;
    }
  }
  if (!board.includes('')) {
    active = false; stopTimer(); timeLeft = TURN_TIME; updateTimerUI(); scores.D++; syncScores();
    setStatus('sd', '🤝 Draw!'); saveState(); return;
  }
  cur = cur === 'X' ? 'O' : 'X';
  updateStatus();
  resetTurnTimer();
}

// ─── STATUS HELPERS ───
function updateStatus() {
  const n = cur === 'X' ? nameX() : nameO();
  if (cur === 'X') {
    setStatusHTML('sx', `<span class="status-sym sym-x">✕</span> ${n}'s turn`);
  } else {
    setStatusHTML('so', `<span class="status-sym sym-o"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="6.5" stroke="white" stroke-width="2.8" fill="none"/></svg></span> ${n}'s turn`);
  }
}
function setStatus(cls, msg) { status_el.className = 'status-bar ' + cls; status_el.innerHTML = msg; }
function setStatusHTML(cls, html) { status_el.className = 'status-bar ' + cls; status_el.innerHTML = html; }

// ─── NEW GAME ───
function newGame() {
  board = Array(9).fill(''); cur = 'X'; active = true; hist = [];
  [...board_el.children].forEach(c => { c.className = 'cell'; c.innerHTML = ''; });

  stopTimer();
  timerStarted = false;
  timerPaused = false;
  timeLeft = TURN_TIME;
  updateTimerUI();
  pauseBtn.textContent = '⏸ Pause';

  syncPausedCells();
  syncButtonStates();

  updateStatus();
  saveState();
}

// ─── UNDO ───
function undo() {
  if (!hist.length || !active) return;
  const i = hist.pop(); board[i] = '';
  const c = board_el.children[i]; c.className = 'cell'; c.innerHTML = '';
  cur = cur === 'X' ? 'O' : 'X';

  if (hist.length === 0) {
    stopTimer();
    timerStarted = false;
    timerPaused = false;
    timeLeft = TURN_TIME;
    updateTimerUI();
    pauseBtn.textContent = '⏸ Pause';
    syncPausedCells();
    syncButtonStates();
  } else {
    if (timerStarted && !timerPaused) resetTurnTimer();
  }

  updateStatus();
  saveState();
}

// ─── AI ───
function aiMove() {
  if (!active || timerPaused) return;
  const r = minimax([...board], cur, true, 0);
  if (r.idx !== -1) move(r.idx);
}
function minimax(b, p, isMax, d) {
  for (const [a, bx, c] of WINS)
    if (b[a] && b[a] === b[bx] && b[a] === b[c])
      return { score: b[a] === cur ? 10 - d : d - 10, idx: -1 };
  const emp = b.reduce((a, v, i) => v === '' ? [...a, i] : a, []);
  if (!emp.length) return { score: 0, idx: -1 };
  let best = isMax ? { score: -Infinity, idx: -1 } : { score: Infinity, idx: -1 };
  for (const i of emp) {
    b[i] = p;
    const r = minimax(b, p === 'X' ? 'O' : 'X', !isMax, d + 1);
    b[i] = '';
    if (isMax ? r.score > best.score : r.score < best.score) best = { score: r.score, idx: i };
  }
  return best;
}

// ─── SCORES ───
function syncScores() { scX_el.textContent = scores.X; scO_el.textContent = scores.O; scD_el.textContent = scores.D; }
function bump(p) {
  const el = p === 'X' ? scX_el : scO_el;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 400);
}
function resetScores() { scores = { X: 0, O: 0, D: 0 }; syncScores(); saveState(); }

// ─── NAMES ───
function syncNames() { lblX_el.textContent = nameX(); lblO_el.textContent = nameO(); if (active) updateStatus(); saveState(); }
nx_el.addEventListener('input', syncNames);
no_el.addEventListener('input', syncNames);

// ─── PENCIL EDIT TOGGLE ───
function toggleEdit(player) {
  const input = player === 'x' ? nx_el : no_el;
  const btn = document.getElementById('edit-' + player);
  const isEditing = input.classList.contains('editing');
  if (isEditing) {
    input.blur();
    window.getSelection()?.removeAllRanges();
    input.setSelectionRange(0, 0);
    input.classList.remove('editing');
    input.setAttribute('readonly', '');
    btn.classList.remove('active');
    btn.title = 'Edit name';
    syncNames();
  } else {
    input.classList.add('editing');
    input.removeAttribute('readonly');
    btn.classList.add('active');
    btn.title = 'Confirm name';
    input.focus();
    input.select();
  }
}

nx_el.addEventListener('keydown', e => { if (e.key === 'Enter') toggleEdit('x'); });
no_el.addEventListener('keydown', e => { if (e.key === 'Enter') toggleEdit('o'); });

const editBtnX = document.getElementById('edit-x');
const editBtnO = document.getElementById('edit-o');
editBtnX.addEventListener('mousedown', e => e.preventDefault());
editBtnO.addEventListener('mousedown', e => e.preventDefault());
editBtnX.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
editBtnO.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

nx_el.addEventListener('blur', () => { if (nx_el.classList.contains('editing')) toggleEdit('x'); });
no_el.addEventListener('blur', () => { if (no_el.classList.contains('editing')) toggleEdit('o'); });

document.getElementById('btn-back').addEventListener('click', () => {
  if (nx_el.classList.contains('editing')) toggleEdit('x');
  if (no_el.classList.contains('editing')) toggleEdit('o');
  sessionStorage.removeItem('ttt-state');
});

// ─── MODAL ───
const modalOverlay = document.getElementById('modal-overlay');
document.getElementById('btn-help').addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('modal-close').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

// ─── TIMER UI ───
const CIRCUMFERENCE = 125.6;
const ring_el = document.getElementById('ring-fill');

function updateTimerUI() {
  const frac = timeLeft / TURN_TIME;
  tDisp_el.textContent = timeLeft;
  ring_el.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);
  const urgent = timeLeft <= 4;
  tDisp_el.classList.toggle('urgent', urgent);
  ring_el.classList.toggle('urgent', urgent);
}

// ─── TIMER LOGIC ───
function startTurnTimer() {
  if (!timerStarted || timerPaused) return;
  stopTimer();
  tInt = setInterval(() => {
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) {
      stopTimer();
      if (active) skipTurn();
    }
  }, 1000);
}

function beginTurnTimer() {
  timerStarted = true;
  timerPaused = false;
  timeLeft = TURN_TIME;
  updateTimerUI();
  startTurnTimer();
}

function resetTurnTimer() {
  if (!timerStarted) return;
  timeLeft = TURN_TIME;
  updateTimerUI();
  if (!timerPaused) startTurnTimer();
}

function stopTimer() { clearInterval(tInt); tInt = null; }

function pauseTimer() {
  if (!timerStarted || !active) return;
  if (timerPaused) {
    // RESUME
    timerPaused = false;
    pauseBtn.textContent = '⏸ Pause';
    syncPausedCells();
    syncButtonStates();
    startTurnTimer();
  } else {
    // PAUSE
    timerPaused = true;
    stopTimer();
    pauseBtn.textContent = '▶ Resume';
    syncPausedCells();
    syncButtonStates();
  }
  saveState();
}

function skipTurn() {
  cur = cur === 'X' ? 'O' : 'X';
  updateStatus();
  resetTurnTimer();
}

// ─── CONFETTI ───
function confetti() {
  const cols = ['#c9e78a', '#ffb2b2', '#ffd700', '#a8d455', '#e85d6a', '#3daa60', '#ffffff', '#ffd6a5'];
  for (let i = 0; i < 65; i++) setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'cp';
    const sz = 6 + Math.random() * 10;
    el.style.cssText = `left:${Math.random() * 100}vw;top:-12px;
      width:${sz}px;height:${sz * (Math.random() > .45 ? 1 : 2.2)}px;
      background:${cols[~~(Math.random() * cols.length)]};
      border-radius:${Math.random() > .4 ? '50%' : '3px'};
      border:1.5px solid rgba(255,255,255,0.4);
      animation-duration:${2 + Math.random() * 2}s;
      animation-delay:${Math.random() * .4}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }, i * 22);
}

// ─── PARTICLE SYSTEM ───
function initParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width = rect.width || window.innerWidth;
    H = canvas.height = rect.height || window.innerHeight;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-scheme') === 'dark';
  }

  function createParticles() {
    const count = Math.floor((W * H) / 7500);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 6 + 3,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.22 + 0.1
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const alpha = isDark() ? 0.55 : 1;
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a * alpha})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < -p.r) p.x = W + p.r;
      if (p.x > W + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = H + p.r;
      if (p.y > H + p.r) p.y = -p.r;
    });
    requestAnimationFrame(draw);
  }

  resize(); createParticles(); draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
}

initParticles(document.getElementById('particle-canvas'));

// ─── THEME ───
scheme_el.addEventListener('change', e => {
  document.documentElement.setAttribute('data-scheme', e.target.value);
  localStorage.setItem('ttt-scheme', e.target.value);
});

// ─── BUTTON BINDINGS ───
document.getElementById('btn-new').addEventListener('click', newGame);
pauseBtn.addEventListener('click', pauseTimer);
document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-ai').addEventListener('click', aiMove);
document.getElementById('btn-rs').addEventListener('click', resetScores);

// ─── SAVE / RESTORE STATE ───
function saveState() {
  try {
    sessionStorage.setItem('ttt-state', JSON.stringify({
      board, cur, active, hist, scores,
      nameX: nx_el.value,
      nameO: no_el.value,
      timeLeft, timerStarted, timerPaused
    }));
  } catch (e) { }
}

function restoreState() {
  try {
    const raw = sessionStorage.getItem('ttt-state');
    if (!raw) return false;
    const s = JSON.parse(raw);

    nx_el.value = s.nameX || 'Player X';
    no_el.value = s.nameO || 'Player O';
    lblX_el.textContent = nx_el.value;
    lblO_el.textContent = no_el.value;

    scores = s.scores || { X: 0, O: 0, D: 0 };
    syncScores();

    board = s.board || Array(9).fill('');
    cur = s.cur || 'X';
    active = s.active != null ? s.active : true;
    hist = s.hist || [];

    build();
    board.forEach((v, i) => {
      if (!v) return;
      const cell = board_el.children[i];
      cell.classList.add('taken', v === 'X' ? 'cx-cell' : 'co-cell');
      cell.innerHTML = `<span class="cell-sym">${v}</span>`;
    });

    if (!active) {
      for (const [a, b, c] of WINS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          [board_el.children[a], board_el.children[b], board_el.children[c]]
            .forEach(el => el.classList.add('winner'));
          break;
        }
      }
      if (!board.includes('')) {
        setStatus('sd', '🤝 Draw!');
      } else {
        const lastVal = hist.length ? board[hist[hist.length - 1]] : cur;
        const n = lastVal === 'X' ? nx_el.value : no_el.value;
        setStatus('sw', `🎉 ${n} wins!`);
      }
    } else {
      updateStatus();
    }

    timerStarted = s.timerStarted || false;
    timeLeft = s.timeLeft != null ? s.timeLeft : TURN_TIME;

    if (timerStarted && active) {
      timerPaused = true;
      pauseBtn.textContent = '▶ Resume';
    } else {
      timerPaused = false;
      pauseBtn.textContent = '⏸ Pause';
    }

    updateTimerUI();
    syncPausedCells();
    syncButtonStates();

    return true;
  } catch (e) { return false; }
}

// ─── INIT ────
(function init() {
  const s = localStorage.getItem('ttt-scheme') || 'default';
  document.documentElement.setAttribute('data-scheme', s);
  scheme_el.value = s;

  if (!restoreState()) {
    build();
    timerStarted = false;
    timerPaused = false;
    timeLeft = TURN_TIME;
    updateTimerUI();
    pauseBtn.textContent = '⏸ Pause';
    syncButtonStates();
    updateStatus();
  }
})();