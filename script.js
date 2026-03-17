// Game data
let logoColors = [
  "var(--game1-logo)",
  "var(--game2-logo)",
  "var(--game3-logo)"
];
let keyframes = [
  "wave-game1-effect",
  "wave-game2-effect",
  "wave-game3-effect"
];

// GSAP animations — exclude center image from float
gsap.from(".fruit-image:not(.image-center)", { y: "-100vh", delay: 0.5 });
gsap.to(".fruit-image:not(.image-center) img", {
  x: "random(-20, 20)",
  y: "random(-20, 20)",
  zIndex: 22,
  duration: 2,
  ease: "none",
  yoyo: true,
  repeat: -1
});
// Center image + title stack drops in on load
gsap.from(".game-center-stack", { y: "-100vh", delay: 0.5, duration: 0.8 });

// Get elements
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const sectionContainer = document.querySelector(".section-container");
const siteTitle = document.querySelector(".site-title");
const siteLogo = document.querySelector(".site-logo");

let currentIndex = 0;
let currentPosition = 0;

function updateHeaderColors(index) {
  gsap.to(siteTitle, { color: logoColors[index], duration: 0.8 });
  gsap.to(siteLogo, { color: logoColors[index], duration: 0.8 });
}

// Helper: animate the game-title of the section now in view
function animateCurrentTitle() {
  const sections = document.querySelectorAll(".section");
  const currentTitle = sections[currentIndex]?.querySelector(".game-title");
  if (currentTitle) {
    gsap.from(currentTitle, { y: "20%", opacity: 0, duration: 0.5 });
  }
}

// Next button
nextButton.addEventListener("click", () => {
  if (currentPosition > -200) {
    currentPosition -= 100;
    sectionContainer.style.left = `${currentPosition}%`;
  }
  currentIndex++;

  updateHeaderColors(currentIndex);
  gsap.from(".fruit-image:not(.image-center)", { y: "-100vh", delay: 0.4, duration: 0.4 });
  animateCurrentTitle();

  if (currentIndex === logoColors.length - 1) {
    nextButton.style.display = "none";
  }
  if (currentIndex > 0) {
    prevButton.style.display = "block";
  }
  if (currentIndex + 1 < logoColors.length) nextButton.style.color = logoColors[currentIndex + 1];
  if (currentIndex - 1 >= 0) prevButton.style.color = logoColors[currentIndex - 1];
  if (currentIndex + 1 < keyframes.length) nextButton.style.animationName = keyframes[currentIndex + 1];
  if (currentIndex - 1 >= 0) prevButton.style.animationName = keyframes[currentIndex - 1];
});

// Prev button
prevButton.addEventListener("click", () => {
  if (currentPosition < 0) {
    currentPosition += 100;
    sectionContainer.style.left = `${currentPosition}%`;
    sectionContainer.style.transition = "all 0.5s ease-in-out";
  }
  currentIndex--;

  updateHeaderColors(currentIndex);
  gsap.from(".fruit-image:not(.image-center)", { y: "100vh", delay: 0.5 });
  animateCurrentTitle();

  nextButton.style.display = "block";
  if (currentIndex === 0) {
    prevButton.style.display = "none";
  }
  if (currentIndex + 1 < logoColors.length) nextButton.style.color = logoColors[currentIndex + 1];
  if (currentIndex - 1 >= 0) prevButton.style.color = logoColors[currentIndex - 1];
  if (currentIndex + 1 < keyframes.length) nextButton.style.animationName = keyframes[currentIndex + 1];
  if (currentIndex - 1 >= 0) prevButton.style.animationName = keyframes[currentIndex - 1];
});