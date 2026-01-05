/* ==========================================================
   scroll-work.js — pause hero bg on scroll + mobile snap
   Dispatches 'hero:pause' and 'hero:resume' events
   ========================================================== */

let target = 0;
let current = 0;
let velocity = 0;

/* elements — MATCH CURRENT HTML */
const hero  = document.querySelector('canvas');
const work  = document.getElementById('work');
const title = document.querySelector('.work-heading');
const lines = document.querySelectorAll('.work-nav li');

const MOBILE_BREAKPOINT = 767;

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

/* ---------- HERO PAUSE / RESUME EVENTS (debounced) ---------- */
let heroPaused = false;
function dispatchHeroPause() {
  if (heroPaused) return;
  heroPaused = true;
  document.dispatchEvent(new CustomEvent('hero:pause'));
}
function dispatchHeroResume() {
  if (!heroPaused) return;
  heroPaused = false;
  document.dispatchEvent(new CustomEvent('hero:resume'));
}

/* ==========================================================
   DESKTOP INPUT (UNCHANGED) — with hero pause trigger
   ========================================================== */

/* desktop wheel */
window.addEventListener('wheel', e => {
  if (isMobile()) return;
  // start pause as soon as user scrolls on desktop
  dispatchHeroPause();
  velocity += e.deltaY * 0.0009;
}, { passive: true });

/* touch on large-screen devices (Surface / tablets) */
let lastY = null;

window.addEventListener('touchstart', e => {
  if (isMobile()) return;
  lastY = e.touches[0].clientY;
  dispatchHeroPause();
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (isMobile()) return;
  if (!lastY) return;

  const y = e.touches[0].clientY;
  const delta = lastY - y;
  lastY = y;

  velocity += delta * 0.0009;
}, { passive: true });

window.addEventListener('touchend', () => {
  lastY = null;
});

/* ==========================================================
   MOBILE SMOOTH SCROLL + AUTO SNAP (SLOWED)
   Dispatches hero pause/resume based on scroll position
   ========================================================== */

let mobileTarget = 0;
let mobileCurrent = 0;
let mobileVelocity = 0;
let mobileLastY = null;
let isTouching = false;

const MANUAL_LERP = 0.14;   // normal scroll responsiveness
const SNAP_LERP   = 0.06;   // slower auto snap speed
const AUTO_SNAP_VELOCITY_THRESHOLD = 0.08;
const RESUME_PIXEL_THRESHOLD = 8; // pixels from top to consider hero fully visible

function initMobileSmoothScroll() {
  if (!isMobile()) return;

  mobileCurrent = window.scrollY;
  mobileTarget  = mobileCurrent;

  window.addEventListener('touchstart', e => {
    isTouching = true;
    mobileLastY = e.touches[0].clientY;
    // user started touching -> pause hero
    dispatchHeroPause();
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!isTouching || mobileLastY === null) return;

    const y = e.touches[0].clientY;
    const delta = mobileLastY - y;
    mobileLastY = y;

    mobileVelocity += delta * 1.1;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isTouching = false;
    mobileLastY = null;
  });
}

function getWorkVisibilityRatio() {
  if (!work) return 0;
  const rect = work.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = Math.min(vh, rect.bottom) - Math.max(0, rect.top);
  return Math.max(0, Math.min(1, visible / vh));
}

function mobileSmoothLoop() {
  if (!isMobile()) {
    requestAnimationFrame(mobileSmoothLoop);
    return;
  }

  mobileTarget += mobileVelocity;
  mobileVelocity *= 0.88;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  mobileTarget = Math.max(0, Math.min(maxScroll, mobileTarget));

  /* ================= AUTO SNAP ================= */
  let lerpSpeed = MANUAL_LERP;
  const velocityStopped = Math.abs(mobileVelocity) < AUTO_SNAP_VELOCITY_THRESHOLD;

  if (!isTouching && velocityStopped) {
    const ratio = getWorkVisibilityRatio();

    if (ratio >= 0.5) {
      mobileTarget = work.offsetTop;
      lerpSpeed = SNAP_LERP; // slow forward snap
      // ensure hero remains paused while snapped to work
      dispatchHeroPause();
    } else {
      mobileTarget = 0;
      lerpSpeed = SNAP_LERP; // slow backward snap
      // allow resume when hero is (nearly) fully visible — handled below
    }
  }

  mobileCurrent += (mobileTarget - mobileCurrent) * lerpSpeed;
  window.scrollTo(0, mobileCurrent);

  /* Resume hero when user scrolled back to near top */
  if (!isTouching && Math.abs(mobileCurrent) <= RESUME_PIXEL_THRESHOLD) {
    dispatchHeroResume();
  } else {
    // if we're not at top, keep paused
    dispatchHeroPause();
  }

  requestAnimationFrame(mobileSmoothLoop);
}

/* ==========================================================
   MAIN LOOP (DESKTOP ONLY) — also controls hero resume when completely back
   ========================================================== */

function loop() {
  if (isMobile()) {
    requestAnimationFrame(loop);
    return;
  }

  target += velocity;
  velocity *= 0.82;

  /* snap settle for desktop */
  if (Math.abs(velocity) < 0.001) {
    target += (target > 0.5 ? 1 - target : -target) * 0.08;
  }

  target = Math.max(0, Math.min(1, target));
  current += (target - current) * 0.08;

  /* hero transforms (desktop only) */
  if (hero) {
    hero.style.transform = `translateY(${-current * 22}vh)`;
    hero.style.opacity = 1 - current * 1.1;
  }

  /* work */
  if (work) {
    work.style.transform = `translateY(${(1 - current) * 100}%)`;
    work.style.opacity = Math.min(1, current * 1.2);
  }

  /* title */
  if (title) {
    const p = Math.min(1, (current - 0.15) * 6);
    title.style.opacity = p;
    title.style.transform = `translateY(${(1 - p) * 12}px)`;
  }

  /* list */
  lines.forEach((li, i) => {
    const delay = 0.22 + i * 0.06;
    const p = Math.min(1, Math.max(0, (current - delay) * 6));
    li.style.opacity = p;
    li.style.transform = `translateY(${(1 - p) * 14}px)`;
  });

  /* hero pause/resume logic for desktop based on current value */
  // When current is almost 0 → hero fully visible → resume
  if (current <= 0.02) {
    dispatchHeroResume();
  } else {
    dispatchHeroPause();
  }

  requestAnimationFrame(loop);
}

/* ==========================================================
   INIT
   ========================================================== */

initMobileSmoothScroll();
mobileSmoothLoop();
loop();
