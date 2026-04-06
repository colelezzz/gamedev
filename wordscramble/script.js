
/* ══════════════════════════════════════
   CONFIG
══════════════════════════════════════ */
const API_BASE = "https://random-word-api.herokuapp.com/word";
const DIFF_CONFIG = {
    easy: { apiDiff: 1, minLen: 3, maxLen: 5, label: "🟢 Easy", cls: "diff-easy" },
    medium: { apiDiff: 2, minLen: 5, maxLen: 7, label: "🟡 Medium", cls: "diff-medium" },
    hard: { apiDiff: 4, minLen: 7, maxLen: 12, label: "🔴 Hard", cls: "diff-hard" },
};
const FALLBACK = [
    { w: "apple", diff: "easy" }, { w: "train", diff: "easy" }, { w: "music", diff: "easy" }, { w: "happy", diff: "easy" },
    { w: "ocean", diff: "easy" }, { w: "flame", diff: "easy" }, { w: "grape", diff: "easy" }, { w: "horse", diff: "easy" },
    { w: "bright", diff: "medium" }, { w: "garden", diff: "medium" }, { w: "melody", diff: "medium" },
    { w: "purple", diff: "medium" }, { w: "travel", diff: "medium" }, { w: "silver", diff: "medium" },
    { w: "window", diff: "medium" }, { w: "coding", diff: "medium" },
    { w: "diamond", diff: "hard" }, { w: "blanket", diff: "hard" }, { w: "history", diff: "hard" },
    { w: "reading", diff: "hard" }, { w: "kitchen", diff: "hard" }, { w: "concert", diff: "hard" },
];
const CIRCUMFERENCE = 2 * Math.PI * 40;

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let current = null, scrambled = "", totalSecs = 30, timeLeft = 0;
let timerInterval = null, gameRunning = false, paused = false;
let scoreCorrect = 0, scoreWrong = 0, scoreSkipped = 0, streak = 0, bestStreak = 0;
let hintRevealed = false, wordQueue = [];

/* ══════════════════════════════════════
   DOM REFS
══════════════════════════════════════ */
const $status = document.getElementById("status");
const $tiles = document.getElementById("scramble-letters");
const $catBadge = document.getElementById("category-badge");
const $diffBadge = document.getElementById("diff-badge");
const $guess = document.getElementById("guess");
const $btnSubmit = document.getElementById("btn-submit");
const $btnSkip = document.getElementById("btn-skip");
const $btnPause = document.getElementById("btn-pause");
const $btnStart = document.getElementById("btn-start");
const $btnReset = document.getElementById("btn-reset");
const $btnHint = document.getElementById("btn-hint");
const $hintBox = document.getElementById("hint-box");
const $scCorrect = document.getElementById("sc-correct");
const $scWrong = document.getElementById("sc-wrong");
const $scStreak = document.getElementById("sc-streak");
const $scBest = document.getElementById("sc-best");
const $timerNum = document.getElementById("timer-num");
const $ringProg = document.getElementById("ring-progress");
const $ringGlow = document.getElementById("ring-glow");
const $timerLabel = document.getElementById("timer-meta-label");
const $timerSub = document.getElementById("timer-meta-sub");
const $timerError = document.getElementById("timer-error");
const $progFill = document.getElementById("progress-fill");
const $progText = document.getElementById("prog-text");
const $progAcc = document.getElementById("prog-acc");
const $pausedVeil = document.getElementById("paused-veil");
const $cdOverlay = document.getElementById("countdown-overlay");
const $cdNum = document.getElementById("countdown-num");
const $cdMsg = document.getElementById("countdown-msg");
const $resOverlay = document.getElementById("results-overlay");
const $scheme = document.getElementById("scheme");
const $overlay = document.getElementById("modal-overlay");
const $modalClose = document.getElementById("modal-close");
const $btnHelp = document.getElementById("btn-help");
const $customRow = document.getElementById("custom-row");
const $customSecs = document.getElementById("custom-secs");
const $timerOpts = document.querySelectorAll(".timer-opt-btn");
const $whList = document.getElementById("wh-list");

/* ══════════════════════════════════════
   WORD HISTORY
══════════════════════════════════════ */
function pushWordHistory(word, result) {
    const empty = $whList.querySelector(".wh-empty");
    if (empty) empty.remove();
    const labels = { correct: "✓ Correct", wrong: "✗ Wrong", skip: "⏭ Skipped" };
    const row = document.createElement("div");
    row.className = "wh-row";
    row.innerHTML = `<span class="wh-word">${word.toUpperCase()}</span><span class="wh-badge wh-${result}">${labels[result]}</span>`;
    $whList.prepend(row);
    const rows = $whList.querySelectorAll(".wh-row");
    if (rows.length > 5) rows[rows.length - 1].remove();
}
function clearWordHistory() {
    $whList.innerHTML = '<div class="wh-empty">No words yet — start the game!</div>';
}

/* ══════════════════════════════════════
   RING
══════════════════════════════════════ */
function setRing(t, total) {
    const pct = total > 0 ? t / total : 1;
    const dash = CIRCUMFERENCE * (1 - pct);
    $ringProg.style.strokeDashoffset = dash;
    $ringGlow.style.strokeDashoffset = dash;
    const urgent = gameRunning && t <= Math.max(5, Math.floor(total * 0.15));
    $ringProg.classList.toggle("urgent", urgent);
    $ringGlow.classList.toggle("urgent", urgent);
    $timerNum.classList.toggle("urgent", urgent);
}
function resetRing() {
    $ringProg.style.strokeDashoffset = 0;
    $ringGlow.style.strokeDashoffset = 0;
    $ringProg.classList.remove("urgent");
    $ringGlow.classList.remove("urgent");
    $timerNum.classList.remove("urgent");
}

/* ══════════════════════════════════════
   TIMER ERROR HELPERS
══════════════════════════════════════ */
function showTimerError(msg) {
    $timerError.textContent = "⚠ " + msg;
    $timerError.classList.add("visible");
    // re-trigger shake animation
    $timerError.style.animation = "none";
    void $timerError.offsetWidth;
    $timerError.style.animation = "";
    $customSecs.classList.add("input-error");
}
function hideTimerError() {
    $timerError.classList.remove("visible");
    $customSecs.classList.remove("input-error");
}

/* ══════════════════════════════════════
   TIMER
══════════════════════════════════════ */
function startCountdown() {
    clearInterval(timerInterval);
    timeLeft = totalSecs;
    $timerNum.textContent = timeLeft;
    setRing(timeLeft, totalSecs);
    $timerLabel.textContent = `${timeLeft}s remaining`;
    $timerSub.textContent = "Game running!";
    timerInterval = setInterval(() => {
        if (paused) return;
        timeLeft--;
        $timerNum.textContent = timeLeft;
        setRing(timeLeft, totalSecs);
        $timerLabel.textContent = `${timeLeft}s remaining`;
        saveGame();
        if (timeLeft <= 0) { clearInterval(timerInterval); onTimeUp(); }
    }, 1000);
}
function stopCountdown() { clearInterval(timerInterval); }

/* ══════════════════════════════════════
   STATUS
══════════════════════════════════════ */
function setStatus(type, text) {
    $status.className = "status-bar";
    const cls = { idle: "s-idle", waiting: "s-waiting", correct: "s-correct", wrong: "s-wrong", timeout: "s-timeout", paused: "s-paused" }[type] || "";
    if (cls) $status.classList.add(cls);
    $status.textContent = text;
}

/* ══════════════════════════════════════
   TILES
══════════════════════════════════════ */
function renderTiles(letters, state = "") {
    $tiles.innerHTML = "";
    letters.split("").forEach((ch, i) => {
        const t = document.createElement("div");
        t.className = "scramble-tile" + (state ? " " + state : "");
        t.textContent = ch.toUpperCase();
        t.style.animationDelay = (i * 0.035) + "s";
        $tiles.appendChild(t);
    });
}
function showLoading(msg = "Fetching word…") {
    $tiles.innerHTML = `<div class="scramble-loading">${msg}</div>`;
    $catBadge.textContent = "—";
    $diffBadge.textContent = "—";
    $diffBadge.className = "diff-badge";
}

/* ══════════════════════════════════════
   DIFFICULTY
══════════════════════════════════════ */
function renderDiffBadge(diff) {
    const cfg = DIFF_CONFIG[diff] || DIFF_CONFIG.easy;
    $diffBadge.textContent = cfg.label;
    $diffBadge.className = "diff-badge " + cfg.cls;
}
function randDiff() { const r = Math.random(); return r < .50 ? "easy" : r < .82 ? "medium" : "hard"; }

/* ══════════════════════════════════════
   WORD FETCHING
══════════════════════════════════════ */
async function fetchWord(diff) {
    const cfg = DIFF_CONFIG[diff];
    try {
        const res = await fetch(`${API_BASE}?number=12&diff=${cfg.apiDiff}`);
        const data = await res.json();
        const valid = data.filter(w => typeof w === "string" && w.length >= cfg.minLen && w.length <= cfg.maxLen && /^[a-z]+$/.test(w));
        if (!valid.length) throw new Error("none");
        return { w: valid[Math.floor(Math.random() * valid.length)], diff };
    } catch (_) {
        const pool = FALLBACK.filter(x => x.diff === diff);
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
async function prefetch(n = 3) {
    const res = await Promise.all(Array.from({ length: n }, () => fetchWord(randDiff())));
    wordQueue.push(...res);
}
async function getWord() {
    if (!wordQueue.length) wordQueue.push(await fetchWord(randDiff()));
    const w = wordQueue.shift();
    if (wordQueue.length < 2) prefetch(2);
    return w;
}

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function shuffle(w) {
    const a = w.split("");
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a.join("");
}
function getScrambled(w) { let s = shuffle(w), t = 0; while (s === w && t++ < 20) s = shuffle(w); return s; }
function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); el.addEventListener("animationend", () => el.classList.remove("bump"), { once: true }); }

/* ══════════════════════════════════════
   PROGRESS
══════════════════════════════════════ */
function updateProgress() {
    const total = scoreCorrect + scoreWrong + scoreSkipped;
    const acc = total > 0 ? Math.round((scoreCorrect / total) * 100) : 0;
    $progFill.style.width = acc + "%";
    $progText.textContent = total + " word" + (total !== 1 ? "s" : "") + " done";
    $progAcc.textContent = total > 0 ? acc + "% acc" : "— acc";
}

/* ══════════════════════════════════════
   LOCK / UNLOCK
══════════════════════════════════════ */
function lockAll() {
    $guess.disabled = true; $btnSubmit.disabled = true;
    $btnHint.disabled = true; $btnSkip.disabled = true;
}
function unlockPlay() {
    if (!gameRunning || paused) return;
    $guess.disabled = false; $btnSubmit.disabled = false;
    $btnHint.disabled = hintRevealed; $btnSkip.disabled = false;
}

/* ══════════════════════════════════════
   PAUSE
══════════════════════════════════════ */
function setPause(p) {
    paused = p;
    $pausedVeil.classList.toggle("visible", p);
    $btnPause.textContent = p ? "▶ Resume" : "⏸ Pause";
    if (p) {
        $guess.disabled = true; $btnSubmit.disabled = true;
        $btnHint.disabled = true; $btnSkip.disabled = true;
        setStatus("paused", "⏸ Game paused — press Resume to continue");
        $timerSub.textContent = "Paused";
        saveGame();
    } else {
        $guess.disabled = false; $btnSubmit.disabled = false;
        $btnHint.disabled = hintRevealed; $btnSkip.disabled = false;
        setStatus("idle", "🔤 Unscramble the word!");
        $timerSub.textContent = "Game running!";
        $guess.focus();
    }
}

/* ══════════════════════════════════════
   COUNTDOWN ANIMATION
══════════════════════════════════════ */
function showCountdown() {
    return new Promise(resolve => {
        $cdOverlay.classList.add("active");
        let n = 3;
        const tick = () => {
            $cdNum.classList.remove("pop"); void $cdNum.offsetWidth; $cdNum.classList.add("pop");
            if (n === 3) { $cdNum.textContent = "3"; $cdMsg.textContent = "Get Ready!"; }
            else if (n === 2) { $cdNum.textContent = "2"; $cdMsg.textContent = "Steady…"; }
            else if (n === 1) { $cdNum.textContent = "1"; $cdMsg.textContent = "Almost…"; }
            else { $cdNum.textContent = "GO!"; $cdMsg.textContent = "Start typing!"; setTimeout(() => { $cdOverlay.classList.remove("active"); resolve(); }, 650); return; }
            n--; setTimeout(tick, 850);
        };
        tick();
    });
}

/* ══════════════════════════════════════
   RESULTS
══════════════════════════════════════ */
function showResults() {
    const total = scoreCorrect + scoreWrong + scoreSkipped;
    const acc = total > 0 ? Math.round((scoreCorrect / total) * 100) : 0;
    let emoji, title;
    if (acc === 100 && total > 0) { emoji = "🏆"; title = "Perfect!"; }
    else if (acc >= 80) { emoji = "🎉"; title = "Amazing!"; }
    else if (acc >= 60) { emoji = "😊"; title = "Great Job!"; }
    else if (acc >= 40) { emoji = "👍"; title = "Not Bad!"; }
    else { emoji = "💪"; title = "Keep Going!"; }
    document.getElementById("res-emoji").textContent = emoji;
    document.getElementById("res-title").textContent = title;
    document.getElementById("res-score").textContent = scoreCorrect;
    document.getElementById("res-correct").textContent = scoreCorrect;
    document.getElementById("res-wrong").textContent = scoreWrong;
    document.getElementById("res-streak").textContent = bestStreak;
    document.getElementById("res-skipped").textContent = scoreSkipped;
    $resOverlay.classList.add("active");
    confetti(65);
}

/* ══════════════════════════════════════
   GAME FLOW
══════════════════════════════════════ */
async function startGame() {
    const selBtn = document.querySelector(".timer-opt-btn.sel");
    if (selBtn && selBtn.dataset.secs === "custom") {
        const v = parseInt($customSecs.value);
        // Validate: single digit or empty = error
        if (isNaN(v) || v < 10) {
            showTimerError(v < 1 || isNaN(v) ? "Please enter a number first." : "Min. 10 seconds required.");
            $customSecs.focus();
            return; // block start
        }
        totalSecs = Math.min(v, 600);
        hideTimerError();
    } else if (selBtn) {
        totalSecs = parseInt(selBtn.dataset.secs);
        hideTimerError();
    }
    scoreCorrect = scoreWrong = scoreSkipped = streak = bestStreak = 0;
    $scCorrect.textContent = $scWrong.textContent = $scStreak.textContent = $scBest.textContent = 0;
    wordQueue = []; paused = false;
    $pausedVeil.classList.remove("visible");
    $btnPause.textContent = "⏸ Pause";
    $btnStart.disabled = true;
    $timerOpts.forEach(b => b.disabled = true);
    $customSecs.disabled = true;
    lockAll();
    clearWordHistory();
    showLoading("Preparing…");
    setStatus("waiting", "⏳ Loading words…");
    await prefetch(4);
    await showCountdown();
    gameRunning = true;
    $btnPause.disabled = false;
    updateProgress();
    startCountdown();
    await loadNextWord();
}

async function loadNextWord() {
    showLoading(); lockAll();
    current = await getWord();
    scrambled = getScrambled(current.w);
    hintRevealed = false;
    $guess.value = "";
    $hintBox.textContent = "Press \"Reveal Hint\" to get a clue…";
    $hintBox.classList.remove("revealed");
    $catBadge.textContent = "🔤 Word";
    renderDiffBadge(current.diff);
    renderTiles(scrambled);
    setStatus("idle", "🔤 Unscramble the word!");
    unlockPlay();
    saveGame();
    $guess.focus();
}

function onCorrect() {
    scoreCorrect++; streak++;
    if (streak > bestStreak) { bestStreak = streak; $scBest.textContent = bestStreak; bump($scBest); }
    bump($scCorrect); $scCorrect.textContent = scoreCorrect;
    $scStreak.textContent = streak;
    renderTiles(current.w, "correct-tile");
    setStatus("correct", "✅ Correct! Loading next word…");
    pushWordHistory(current.w, "correct");
    confetti(); updateProgress(); lockAll(); saveGame();
    setTimeout(() => { if (gameRunning && !paused) loadNextWord(); }, 650);
}

function onWrong() {
    const attempt = ($guess.value || "").trim();
    scoreWrong++; streak = 0;
    bump($scWrong); $scWrong.textContent = scoreWrong;
    $scStreak.textContent = 0;
    renderTiles(scrambled, "wrong-tile");
    setStatus("wrong", "❌ Try Again!");
    pushWordHistory(attempt ? attempt : "—", "wrong");
    $guess.value = "";
    saveGame();
    setTimeout(() => { if (gameRunning && !paused) renderTiles(scrambled); }, 480);
    $guess.focus();
}

function onSkip() {
    if (!gameRunning || paused) return;
    scoreSkipped++; streak = 0; $scStreak.textContent = 0;
    renderTiles(current.w, "wrong-tile");
    setStatus("timeout", "⏭ Skipped! The word was: " + current.w.toUpperCase());
    pushWordHistory(current.w, "skip");
    updateProgress(); lockAll(); saveGame();
    setTimeout(() => { if (gameRunning && !paused) loadNextWord(); }, 900);
}

function onTimeUp() {
    gameRunning = false; stopCountdown(); lockAll(); clearSavedGame();
    $btnPause.disabled = true;
    $timerNum.textContent = "0"; setRing(0, totalSecs);
    $timerLabel.textContent = "Time's up!"; $timerSub.textContent = "Round over";
    setStatus("timeout", "⏰ Time's up!");
    setTimeout(showResults, 800);
}

function resetGame() {
    stopCountdown(); gameRunning = false; paused = false; clearSavedGame();
    $pausedVeil.classList.remove("visible");
    lockAll();
    $btnPause.disabled = true; $btnPause.textContent = "⏸ Pause";
    $btnStart.disabled = false;
    $timerOpts.forEach(b => b.disabled = false);
    $customSecs.disabled = false;
    resetRing();
    $timerNum.textContent = totalSecs;
    $timerLabel.textContent = `${totalSecs}s selected`;
    $timerSub.textContent = "Press Start to begin";
    setRing(totalSecs, totalSecs);
    setStatus("waiting", "⏱️ Pick your time and press Start!");
    $tiles.innerHTML = '<div class="scramble-loading">Waiting to start…</div>';
    $catBadge.textContent = "—"; $diffBadge.textContent = "—"; $diffBadge.className = "diff-badge";
    $hintBox.textContent = "Start a game to use hints…"; $hintBox.classList.remove("revealed");
    $guess.value = "";
    scoreCorrect = scoreWrong = scoreSkipped = streak = bestStreak = 0;
    $scCorrect.textContent = $scWrong.textContent = $scStreak.textContent = $scBest.textContent = 0;
    $progFill.style.width = "0%"; $progText.textContent = "0 words done"; $progAcc.textContent = "— acc";
    hideTimerError();
    clearWordHistory();
}

/* ══════════════════════════════════════
   LOCAL STORAGE — PERSISTENCE
══════════════════════════════════════ */
const LS_PREFS = "ws_prefs";      // theme + timer choice
const LS_GAME = "ws_game";       // in-progress game snapshot

/* Save lightweight preferences (always) */
function savePrefs() {
    const selBtn = document.querySelector(".timer-opt-btn.sel");
    const timerSel = selBtn ? selBtn.dataset.secs : "30";
    try {
        localStorage.setItem(LS_PREFS, JSON.stringify({
            theme: $scheme.value,
            timerSel: timerSel,
            customVal: parseInt($customSecs.value) || 45,
            totalSecs: totalSecs
        }));
    } catch (_) { }
}

/* Save full in-progress game snapshot */
function saveGame() {
    if (!gameRunning) { clearSavedGame(); return; }
    const whRows = [...$whList.querySelectorAll(".wh-row")].map(r => ({
        word: r.querySelector(".wh-word").textContent,
        result: [...r.querySelector(".wh-badge").classList].find(c => c.startsWith("wh-") && c !== "wh-badge")?.replace("wh-", "")
    }));
    try {
        localStorage.setItem(LS_GAME, JSON.stringify({
            currentWord: current ? current.w : null,
            currentDiff: current ? current.diff : null,
            scrambled: scrambled,
            timeLeft: timeLeft,
            totalSecs: totalSecs,
            paused: paused,
            hintRevealed: hintRevealed,
            hintText: $hintBox.textContent,
            scoreCorrect: scoreCorrect,
            scoreWrong: scoreWrong,
            scoreSkipped: scoreSkipped,
            streak: streak,
            bestStreak: bestStreak,
            wordHistory: whRows,
            progText: $progText.textContent,
            progAcc: $progAcc.textContent,
            progFill: $progFill.style.width,
            guessValue: $guess.value
        }));
    } catch (_) { }
}

function clearSavedGame() {
    try { localStorage.removeItem(LS_GAME); } catch (_) { }
}

/* Restore preferences (theme + timer choice) */
function restorePrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(LS_PREFS));
        if (!p) return;

        // Theme
        if (p.theme === "dark") {
            $scheme.value = "dark";
            document.documentElement.setAttribute("data-scheme", "dark");
        }

        // Timer selection
        const match = [...$timerOpts].find(b => b.dataset.secs === p.timerSel);
        if (match) {
            $timerOpts.forEach(b => b.classList.remove("sel"));
            match.classList.add("sel");
            if (p.timerSel === "custom") {
                $customRow.style.display = "flex";
                $customSecs.value = p.customVal || 45;
            }
        }
        totalSecs = p.totalSecs || 30;
        $timerNum.textContent = totalSecs;
        $timerLabel.textContent = `${totalSecs}s selected`;
        setRing(totalSecs, totalSecs);
    } catch (_) { }
}

/* Restore an in-progress game after refresh */
function restoreSavedGame() {
    let g;
    try { g = JSON.parse(localStorage.getItem(LS_GAME)); } catch (_) { return false; }
    if (!g || !g.currentWord) return false;

    // Rebuild state
    current = { w: g.currentWord, diff: g.currentDiff };
    scrambled = g.scrambled;
    totalSecs = g.totalSecs;
    timeLeft = g.timeLeft;
    scoreCorrect = g.scoreCorrect;
    scoreWrong = g.scoreWrong;
    scoreSkipped = g.scoreSkipped;
    streak = g.streak;
    bestStreak = g.bestStreak;
    hintRevealed = g.hintRevealed;
    gameRunning = true;
    paused = true; // always resume paused so timer doesn't instantly tick

    // Scoreboard
    $scCorrect.textContent = scoreCorrect;
    $scWrong.textContent = scoreWrong;
    $scStreak.textContent = streak;
    $scBest.textContent = bestStreak;

    // Timer ring
    $timerNum.textContent = timeLeft;
    $timerLabel.textContent = `${timeLeft}s remaining`;
    $timerSub.textContent = "Paused — press Resume";
    setRing(timeLeft, totalSecs);

    // Word tiles + badges
    renderTiles(scrambled);
    $catBadge.textContent = "🔤 Word";
    renderDiffBadge(current.diff);

    // Hint
    $hintBox.textContent = g.hintText || "Press \"Reveal Hint\" to get a clue…";
    if (hintRevealed) { $hintBox.classList.add("revealed"); $btnHint.textContent = "✓ Hint Used"; }
    $btnHint.disabled = true; // locked while paused

    // Progress bar
    $progFill.style.width = g.progFill || "0%";
    $progText.textContent = g.progText || "0 words done";
    $progAcc.textContent = g.progAcc || "— acc";

    // Restore typed input (will be shown but locked while paused)
    $guess.value = g.guessValue || "";

    // Word history
    $whList.innerHTML = "";
    const labels = { correct: "✓ Correct", wrong: "✗ Wrong", skip: "⏭ Skipped" };
    (g.wordHistory || []).forEach(entry => {
        const row = document.createElement("div");
        row.className = "wh-row";
        row.innerHTML = `<span class="wh-word">${entry.word}</span><span class="wh-badge wh-${entry.result}">${labels[entry.result] || entry.result}</span>`;
        $whList.appendChild(row);
    });
    if (!$whList.children.length) {
        $whList.innerHTML = '<div class="wh-empty">No words yet — start the game!</div>';
    }

    // UI controls
    $btnStart.disabled = true;
    $btnPause.disabled = false;
    $btnPause.textContent = "▶ Resume";
    $btnSkip.disabled = true;
    $btnSubmit.disabled = true;
    $guess.disabled = true;
    $timerOpts.forEach(b => b.disabled = true);
    $customSecs.disabled = true;

    // Apply paused veil + status
    $pausedVeil.classList.add("visible");
    setStatus("paused", "⏸ Game restored — press Resume to continue");

    // Start the timer ticking (paused=true so it won't decrement yet)
    timerInterval = setInterval(() => {
        if (paused) return;
        timeLeft--;
        $timerNum.textContent = timeLeft;
        setRing(timeLeft, totalSecs);
        $timerLabel.textContent = `${timeLeft}s remaining`;
        saveGame();
        if (timeLeft <= 0) { clearInterval(timerInterval); onTimeUp(); }
    }, 1000);

    return true;
}

/* ══════════════════════════════════════
   TIMER OPTION BUTTONS
══════════════════════════════════════ */
$timerOpts.forEach(btn => {
    btn.addEventListener("click", () => {
        $timerOpts.forEach(b => b.classList.remove("sel"));
        btn.classList.add("sel");
        if (btn.dataset.secs === "custom") {
            $customRow.style.display = "flex";
            const v = parseInt($customSecs.value);
            if (!isNaN(v) && v >= 10) {
                totalSecs = Math.min(v, 600);
                hideTimerError();
            } else if (!isNaN(v) && v > 0) {
                // show error but don't update ring
                showTimerError("Min. 10 seconds required.");
                totalSecs = 10; // safe fallback for display
            } else {
                totalSecs = 45;
                hideTimerError();
            }
        } else {
            $customRow.style.display = "none";
            totalSecs = parseInt(btn.dataset.secs);
            hideTimerError();
        }
        $timerNum.textContent = totalSecs;
        $timerLabel.textContent = `${totalSecs}s selected`;
        $timerSub.textContent = "Press Start to begin";
        setRing(totalSecs, totalSecs);
        savePrefs();
    });
});

/* ── Custom seconds input: live update ring + error ── */
$customSecs.addEventListener("input", () => {
    const raw = $customSecs.value.trim();
    const v = parseInt(raw);

    if (raw === "" || isNaN(v)) {
        showTimerError("Please enter a valid number.");
        // don't update ring / label
        return;
    }

    if (v < 10) {
        showTimerError("Min. 10 seconds required.");
        // Still reflect what they typed in ring (capped at 1 for visual feedback)
        const display = Math.max(v, 1);
        $timerNum.textContent = display;
        $timerLabel.textContent = `${display}s selected`;
        setRing(display, display); // full ring (red state will kick in once game starts)
        return;
    }

    // ✅ Valid value — update everything
    hideTimerError();
    totalSecs = Math.min(v, 600);
    $timerNum.textContent = totalSecs;
    $timerLabel.textContent = `${totalSecs}s selected`;
    $timerSub.textContent = "Press Start to begin";
    setRing(totalSecs, totalSecs);
    savePrefs();
});

/* ══════════════════════════════════════
   BUTTON EVENTS
══════════════════════════════════════ */
$btnStart.addEventListener("click", startGame);
$btnSubmit.addEventListener("click", () => {
    if (!gameRunning || paused) return;
    const g = $guess.value.trim().toLowerCase();
    if (!g) return;
    g === current.w ? onCorrect() : onWrong();
});
$guess.addEventListener("keydown", e => { if (e.key === "Enter") $btnSubmit.click(); });
$guess.addEventListener("input", () => { if (gameRunning && !paused) saveGame(); });
$btnSkip.addEventListener("click", onSkip);
$btnPause.addEventListener("click", () => { if (!gameRunning) return; setPause(!paused); });
$btnReset.addEventListener("click", () => { $resOverlay.classList.remove("active"); resetGame(); });
$btnHint.addEventListener("click", () => {
    if (!gameRunning || paused || hintRevealed || !current) return;
    hintRevealed = true;
    $hintBox.textContent = `First letter: "${current.w[0].toUpperCase()}" — Length: ${current.w.length}`;
    $hintBox.classList.add("revealed");
    $btnHint.textContent = "✓ Hint Used";
    $btnHint.disabled = true;
});
document.getElementById("res-close").addEventListener("click", () => { $resOverlay.classList.remove("active"); resetGame(); });

/* ══════════════════════════════════════
   THEME & MODAL
══════════════════════════════════════ */
$scheme.addEventListener("change", () => {
    document.documentElement.setAttribute("data-scheme", $scheme.value === "dark" ? "dark" : "");
    savePrefs();
});
$btnHelp.addEventListener("click", () => $overlay.classList.add("open"));
$modalClose.addEventListener("click", () => $overlay.classList.remove("open"));
$overlay.addEventListener("click", e => { if (e.target === $overlay) $overlay.classList.remove("open"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") $overlay.classList.remove("open"); });

/* ══════════════════════════════════════
   CONFETTI
══════════════════════════════════════ */
function confetti(count = 26) {
    const colors = ["#c1bff2", "#8b86e8", "#3c3782", "#f2bfd4", "#e85d6a", "#3daa60", "#fff", "#b8b4ff", "#f0c040"];
    for (let i = 0; i < count; i++) {
        const el = document.createElement("div"); el.className = "cp";
        const sz = 6 + Math.random() * 10;
        el.style.cssText = `left:${10 + Math.random() * 80}vw;top:-20px;width:${sz}px;height:${sz}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > .5 ? "50%" : "2px"};animation-duration:${1.5 + Math.random() * 2}s;animation-delay:${Math.random() * .45}s;`;
        document.body.appendChild(el);
        el.addEventListener("animationend", () => el.remove());
    }
}

/* ══════════════════════════════════════
   PARTICLE SYSTEM
══════════════════════════════════════ */
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

/* ── INIT: restore prefs then try to restore a saved game ── */
restorePrefs();
if (!restoreSavedGame()) {
    setRing(totalSecs, totalSecs);
}

/* ── Clear saved game ONLY when navigating back to index (not on refresh) ── */
document.querySelector(".btn-back").addEventListener("click", () => {
    clearSavedGame();
});