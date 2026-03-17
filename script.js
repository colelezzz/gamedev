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
    // Use getBoundingClientRect for reliable dimensions even before full paint.
    // Fall back to window size if the canvas isn't laid out yet (offsetWidth = 0).
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  || window.innerWidth;
    H = canvas.height = rect.height || window.innerHeight;
  }

  function createParticles() {
    const count = Math.floor((W * H) / 7500); // good density without overcrowding
    particles = Array.from({ length: count }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 6 + 3,          // 3–9px — readable circles
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      a:  Math.random() * 0.22 + 0.1      // 0.1–0.32 — subtle but visible
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

// Defer until after first paint so canvas has real dimensions
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
    onComplete: () => floatOne(el)   // new destination each cycle
  });
}

// Start floating only for a specific section's images
function startFloatingSection(sectionIndex, delay) {
  sectionImgs[sectionIndex].forEach((el, i) => {
    gsap.delayedCall((delay || 0) + i * 0.18, () => floatOne(el));
  });
}

// Kill floating only for a specific section's images
function killFloatingSection(sectionIndex) {
  sectionImgs[sectionIndex].forEach(el => gsap.killTweensOf(el));
}

/* ════════════════════════════════════════════
   INITIAL ENTRANCE (section 0 only)
   ════════════════════════════════════════════ */
gsap.from(sectionImgs[0], {
  y: -window.innerHeight,
  stagger: 0.08,
  delay: 0.3,
  duration: 0.7,
  ease: "power2.out",
  onComplete: () => startFloatingSection(0, 0)
});

gsap.from(".game-center-stack", {
  y: -window.innerHeight,
  delay: 0.3,
  duration: 0.75,
  ease: "power3.out"
});

gsap.from([".game-counter", ".keyboard-hint", ".swipe-hint", ".progress-dots"], {
  opacity: 0, delay: 1.2, duration: 0.6
});

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

  // 1. Slide the container
  sectionContainer.style.left = `${-currentIndex * 100}%`;

  // 2. Update header colour
  gsap.to(siteTitle, { color: logoColors[currentIndex], duration: 0.7 });

  // 3. Kill floats on the OLD section only
  killFloatingSection(prevIndex);

  // 4. Get only THIS section's decorative images
  const imgs = sectionImgs[currentIndex];

  // 5. Kill any stale tweens on these images, then drop them in
  imgs.forEach(el => gsap.killTweensOf(el));

  gsap.fromTo(imgs,
    { x: 0, y: goingForward ? -window.innerHeight * 0.6 : window.innerHeight * 0.6, opacity: 0 },
    {
      x: 0, y: 0, opacity: 1,
      stagger: { each: 0.08, onComplete: function() {
        // Start floating each image individually right after IT lands
        floatOne(this.targets()[0]);
      }},
      delay: 0.1,
      duration: 0.65,
      ease: "power3.out"
    }
  );

  // 6. Animate the center stack title/desc/tag
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
   INIT
   ════════════════════════════════════════════ */
updateNavButtons();
updateDots(0);

if ("ontouchstart" in window) {
  if (swipeHint)    swipeHint.style.display    = "flex";
  if (keyboardHint) keyboardHint.style.display = "none";
}