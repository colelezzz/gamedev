// ─────────────────────────────────────────────
//  Mini Arcade — script.js
// ─────────────────────────────────────────────

/* ── Config ── */
const TOTAL_GAMES = 3;

const logoColors = ["var(--game1-logo)", "var(--game2-logo)", "var(--game3-logo)"];
const keyframes  = ["wave-game1-effect", "wave-game2-effect", "wave-game3-effect"];

/* ── DOM references ── */
const prevButton       = document.getElementById("prevButton");
const nextButton       = document.getElementById("nextButton");
const sectionContainer = document.querySelector(".section-container");
const siteTitle        = document.querySelector(".site-title");
const progressDots     = document.querySelectorAll(".dot");
const gameCounter      = document.getElementById("currentNum");
const keyboardHint     = document.getElementById("keyboardHint");
const swipeHint        = document.getElementById("swipeHint");

// Each section's decorative images as a separate array
const sections    = [...document.querySelectorAll(".section")];
const sectionImgs = sections.map(sec =>
  [...sec.querySelectorAll(".fruit-image:not(.image-center)")]
);

/* ── State ── */
let currentIndex    = 0;
let isAnimating     = false;
const ANIM_DURATION = 520;

/* ════════════════════════════════════════════
   PARTICLE SYSTEM — subtle, not overwhelming
   ════════════════════════════════════════════ */
function initParticles(canvas) {
  const ctx = canvas.getContext("2d");
  let W, H, particles;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  || window.innerWidth;
    H = canvas.height = rect.height || window.innerHeight;
  }

  function createParticles() {
    const count = Math.floor((W * H) / 7500);
    particles = Array.from({ length: count }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 6 + 3,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      a:  Math.random() * 0.22 + 0.1
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < -p.r) p.x = W + p.r;
      if (p.x > W + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = H + p.r;
      if (p.y > H + p.r) p.y = -p.r;
    });
    requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();
  window.addEventListener("resize", () => { resize(); createParticles(); });
}

requestAnimationFrame(() => {
  document.querySelectorAll(".particle-canvas").forEach(c => initParticles(c));
});

/* ════════════════════════════════════════════
   FLOAT — per-section, per-image loops
   ════════════════════════════════════════════ */
function floatOne(el) {
  gsap.to(el, {
    x: gsap.utils.random(-20, 20),
    y: gsap.utils.random(-16, 16),
    duration: gsap.utils.random(2.5, 3.8),
    ease: "sine.inOut",
    onComplete: () => floatOne(el)
  });
}

function startFloatingSection(sectionIndex, delay) {
  sectionImgs[sectionIndex].forEach((el, i) => {
    gsap.delayedCall((delay || 0) + i * 0.18, () => floatOne(el));
  });
}

function killFloatingSection(sectionIndex) {
  sectionImgs[sectionIndex].forEach(el => gsap.killTweensOf(el));
}

/* ════════════════════════════════════════════
   HINTS
   ════════════════════════════════════════════ */
setTimeout(() => {
  keyboardHint?.classList.add("hidden");
  swipeHint?.classList.add("hidden");
}, 5000);

/* ════════════════════════════════════════════
   PROGRESS DOTS
   ════════════════════════════════════════════ */
function updateDots(index) {
  progressDots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  if (gameCounter) gameCounter.textContent = index + 1;
}

progressDots.forEach(dot => {
  dot.addEventListener("click", () => {
    const target = parseInt(dot.dataset.index, 10);
    if (target !== currentIndex) navigateTo(target);
  });
});

/* ════════════════════════════════════════════
   CORE NAVIGATION
   ════════════════════════════════════════════ */
function navigateTo(targetIndex) {
  if (isAnimating || targetIndex === currentIndex) return;
  if (targetIndex < 0 || targetIndex >= TOTAL_GAMES) return;

  isAnimating = true;
  const goingForward = targetIndex > currentIndex;
  const prevIndex    = currentIndex;
  currentIndex       = targetIndex;

  sectionContainer.style.left = `${-currentIndex * 100}%`;

  gsap.to(siteTitle, { color: logoColors[currentIndex], duration: 0.7 });

  killFloatingSection(prevIndex);

  const imgs = sectionImgs[currentIndex];
  imgs.forEach(el => gsap.killTweensOf(el));

  // Animate decorative images
  gsap.fromTo(imgs,
    { x: 0, y: goingForward ? -window.innerHeight * 0.6 : window.innerHeight * 0.6, opacity: 0 },
    {
      x: 0, y: 0, opacity: 1,
      stagger: { each: 0.08, onComplete: function() {
        floatOne(this.targets()[0]);
      }},
      delay: 0.1,
      duration: 0.65,
      ease: "power3.out"
    }
  );

  // Animate center stack (logo + title + desc)
  const centerStack = sections[currentIndex]?.querySelector(".game-center-stack");
  if (centerStack) {
    gsap.killTweensOf(centerStack);
    gsap.fromTo(centerStack,
      { y: goingForward ? -window.innerHeight * 0.6 : window.innerHeight * 0.6, opacity: 0 },
      { y: 0, opacity: 1, delay: 0.1, duration: 0.75, ease: "power3.out" }
    );
  }

  const title = sections[currentIndex]?.querySelector(".game-title");
  const desc  = sections[currentIndex]?.querySelector(".game-desc");
  const tag   = sections[currentIndex]?.querySelector(".game-tag");
  if (title) gsap.from(title, { y: "30%", opacity: 0, duration: 0.5, delay: 0.1 });
  if (desc)  gsap.from(desc,  { y: "20%", opacity: 0, duration: 0.5, delay: 0.2 });
  if (tag)   gsap.from(tag,   { y: "20%", opacity: 0, duration: 0.5, delay: 0.05 });

  updateNavButtons();
  updateDots(currentIndex);

  setTimeout(() => { isAnimating = false; }, ANIM_DURATION);
}

/* ════════════════════════════════════════════
   NAV BUTTONS
   ════════════════════════════════════════════ */
function updateNavButtons() {
  prevButton.style.display = currentIndex === 0 ? "none" : "flex";
  nextButton.style.display = currentIndex === TOTAL_GAMES - 1 ? "none" : "flex";

  const ni = currentIndex + 1;
  const pi = currentIndex - 1;
  if (ni < TOTAL_GAMES) {
    nextButton.style.color         = logoColors[ni];
    nextButton.style.animationName = keyframes[ni];
  }
  if (pi >= 0) {
    prevButton.style.color         = logoColors[pi];
    prevButton.style.animationName = keyframes[pi];
  }
}

nextButton.addEventListener("click", () => navigateTo(currentIndex + 1));
prevButton.addEventListener("click", () => navigateTo(currentIndex - 1));

/* ════════════════════════════════════════════
   KEYBOARD
   ════════════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") navigateTo(currentIndex + 1);
  if (e.key === "ArrowLeft")  navigateTo(currentIndex - 1);
});

/* ════════════════════════════════════════════
   TOUCH / SWIPE
   ════════════════════════════════════════════ */
let touchStartX = null;
let touchStartY = null;
const SWIPE_THRESHOLD = 50;

document.addEventListener("touchstart", e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    if (dx < 0) navigateTo(currentIndex + 1);
    else        navigateTo(currentIndex - 1);
  }
  touchStartX = null;
  touchStartY = null;
}, { passive: true });

/* ════════════════════════════════════════════
   INIT — hash check MUST run before entrance
   animations so we know which section to show
   ════════════════════════════════════════════ */

// Detect if we're coming back from a game page
const _hash     = window.location.hash;
const _hashEl   = _hash ? document.querySelector(_hash) : null;
const _hashGame = _hashEl ? parseInt(_hashEl.dataset.game, 10) : -1;
const _fromHash = !isNaN(_hashGame) && _hashGame > 0 && _hashGame < TOTAL_GAMES;

if (_fromHash) {
  // ── BACK-NAVIGATE BRANCH ─────────────────────
  // Set state before any animations fire
  currentIndex = _hashGame;

  // Jump container instantly — no CSS slide
  sectionContainer.style.transition = "none";
  sectionContainer.style.left = `${-currentIndex * 100}%`;
  sectionContainer.offsetWidth; // force reflow
  sectionContainer.style.transition = "";

  gsap.set(siteTitle, { color: logoColors[currentIndex] });

  // All sections start fully visible at natural CSS state —
  // entrance animations below are scoped so they won't touch them
  sections.forEach((sec, i) => {
    sectionImgs[i].forEach(img => gsap.set(img, { clearProps: "all" }));
    gsap.set(sec.querySelector(".game-center-stack"), { clearProps: "all" });
  });

  // Drop in ONLY the target section's images from top
  gsap.fromTo(
    sectionImgs[currentIndex],
    { y: -window.innerHeight, opacity: 0 },
    {
      y: 0, opacity: 1,
      stagger: 0.08, delay: 0.3, duration: 0.7, ease: "power2.out",
      onComplete: () => startFloatingSection(currentIndex, 0)
    }
  );

  // Drop in ONLY the target section's center stack
  gsap.fromTo(
    sections[currentIndex].querySelector(".game-center-stack"),
    { y: -window.innerHeight, opacity: 0 },
    { y: 0, opacity: 1, delay: 0.3, duration: 0.75, ease: "power3.out" }
  );

  // Fade in UI chrome
  gsap.from([".game-counter", ".keyboard-hint", ".swipe-hint", ".progress-dots"], {
    opacity: 0, delay: 1.2, duration: 0.6
  });

  // Clean up hash so a manual refresh lands on slide 1
  history.replaceState(null, "", window.location.pathname);

} else {
  // ── NORMAL FIRST-LOAD BRANCH ─────────────────

  // Set ALL sections' images and center stacks to hidden initial state.
  // They will only animate in when navigateTo() is called for that section.
  sections.forEach((sec, i) => {
    gsap.set(sec.querySelector(".game-center-stack"), { y: -window.innerHeight, opacity: 0 });
    sectionImgs[i].forEach(img => gsap.set(img, { y: -window.innerHeight, opacity: 0 }));
  });

  // Animate section 0 images drop-in
  gsap.to(sectionImgs[0], {
    y: 0, opacity: 1,
    stagger: 0.08,
    delay: 0.3,
    duration: 0.7,
    ease: "power2.out",
    onComplete: () => startFloatingSection(0, 0)
  });

  // Animate section 0 center stack drop-in
  gsap.to(sections[0].querySelector(".game-center-stack"), {
    y: 0, opacity: 1,
    delay: 0.3,
    duration: 0.75,
    ease: "power3.out"
  });

  gsap.from([".game-counter", ".keyboard-hint", ".swipe-hint", ".progress-dots"], {
    opacity: 0, delay: 1.2, duration: 0.6
  });
}

// Always run last — currentIndex is already correct by this point
updateNavButtons();
updateDots(currentIndex);

if ("ontouchstart" in window) {
  if (swipeHint)    swipeHint.style.display    = "flex";
  if (keyboardHint) keyboardHint.style.display = "none";
}