/* ==========================================================
   scroll-work2.js — PINPOINT TOUCH + TRUE INERTIA + SNAP
   - 1:1 finger tracking while touching
   - REAL momentum after release
   - No jitter, no oscillation
   - Snap logic preserved
   ========================================================== */

/* Disable browser scroll restoration */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

/* ==========================================================
   CORE STATE
   ========================================================== */

let target = 0;
let current = 0;
let velocity = 0;

const hero = document.querySelector('canvas');
const work = document.getElementById('work');

const MOBILE_BREAKPOINT = 767;
const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

/* ==========================================================
   HERO PAUSE / RESUME
   ========================================================== */

let heroPaused = false;

function pauseHero() {
  if (heroPaused) return;
  heroPaused = true;
  document.dispatchEvent(new CustomEvent('hero:pause'));
}

function resumeHero() {
  if (!heroPaused) return;
  heroPaused = false;
  document.dispatchEvent(new CustomEvent('hero:resume'));
}

/* ==========================================================
   DESKTOP INPUT (UNCHANGED)
   ========================================================== */

window.addEventListener(
  'wheel',
  e => {
    if (isMobile()) return;
    pauseHero();
    velocity += e.deltaY * 0.0009;
  },
  { passive: true }
);

/* ==========================================================
   MOBILE STATE
   ========================================================== */

let mPos = 0;            // px
let mVel = 0;            // px per frame
let mTouching = false;

/* snap */
let snapActive = false;
let snapStart = 0;
let snapFrom = 0;
let snapTo = 0;

/* tuning (frame-based, stable) */
const FRICTION = 0.92;          // inertia decay
const STOP_VELOCITY = 0.5;     // px/frame
const SNAP_THRESHOLD = 0.5;
const SNAP_DURATION = 750;
const MAX_VELOCITY = 55;

/* ==========================================================
   HELPERS
   ========================================================== */

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getWorkRatio() {
  const r = work.getBoundingClientRect();
  const vh = window.innerHeight;
  return Math.max(
    0,
    Math.min(1, (Math.min(vh, r.bottom) - Math.max(0, r.top)) / vh)
  );
}

/* ==========================================================
   MOBILE INPUT — TRUE PINPOINT + VELOCITY CAPTURE
   ========================================================== */

let lastY = 0;
let lastTime = 0;
let releaseVelocity = 0;

window.addEventListener(
  'touchstart',
  e => {
    if (!isMobile()) return;

    mTouching = true;
    snapActive = false;
    pauseHero();

    mVel = 0;
    releaseVelocity = 0;

    lastY = e.touches[0].clientY;
    lastTime = performance.now();
  },
  { passive: true }
);

window.addEventListener(
  'touchmove',
  e => {
    if (!isMobile() || !mTouching) return;

    const y = e.touches[0].clientY;
    const now = performance.now();

    const dy = lastY - y;
    const dt = Math.max(1, now - lastTime);

    /* 1️⃣ exact finger follow */
    mPos += dy;

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    mPos = clamp(mPos, 0, maxScroll);

    /* 2️⃣ capture REAL swipe velocity (px per frame approx) */
    const instantVel = (dy / dt) * 16.6; // normalize to ~60fps
    releaseVelocity = releaseVelocity * 0.7 + instantVel * 0.3;

    window.scrollTo(0, mPos);

    lastY = y;
    lastTime = now;
  },
  { passive: true }
);

window.addEventListener('touchend', () => {
  if (!isMobile()) return;

  /* 🔑 inertia begins here */
  mVel = clamp(releaseVelocity, -MAX_VELOCITY, MAX_VELOCITY);

  mTouching = false;
});

/* ==========================================================
   MOBILE LOOP — INERTIA + SNAP (NO JITTER)
   ========================================================== */

function mobileLoop(ts) {
  if (!isMobile()) {
    requestAnimationFrame(mobileLoop);
    return;
  }

  if (!mTouching && !snapActive) {
    /* inertia */
    mVel *= FRICTION;
    mPos += mVel;

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    if (mPos <= 0 || mPos >= maxScroll) {
      mPos = clamp(mPos, 0, maxScroll);
      mVel *= 0.3; // kill bounce
    }

    /* snap decision */
    if (Math.abs(mVel) < STOP_VELOCITY) {
      const ratio = getWorkRatio();
      snapActive = true;
      snapStart = ts;
      snapFrom = mPos;
      snapTo = ratio >= SNAP_THRESHOLD ? work.offsetTop : 0;
      mVel = 0;

      if (snapTo !== 0) pauseHero();
    }
  }

  /* snap glide */
  if (snapActive) {
    const t = Math.min(1, (ts - snapStart) / SNAP_DURATION);
    mPos = snapFrom + (snapTo - snapFrom) * easeOutCubic(t);

    if (t >= 1) {
      snapActive = false;
      mPos = snapTo;
      if (snapTo === 0) resumeHero();
    }
  }

  window.scrollTo(0, Math.round(mPos));
  requestAnimationFrame(mobileLoop);
}

/* ==========================================================
   DESKTOP LOOP (UNCHANGED)
   ========================================================== */

function desktopLoop() {
  if (isMobile()) {
    requestAnimationFrame(desktopLoop);
    return;
  }

  target += velocity;
  velocity *= 0.82;

  if (Math.abs(velocity) < 0.001) {
    target += (target > 0.5 ? 1 - target : -target) * 0.08;
  }

  target = clamp(target, 0, 1);
  current += (target - current) * 0.08;

  if (hero) {
    hero.style.transform = `translateY(${-current * 22}vh)`;
    hero.style.opacity = 1 - current * 1.1;
  }

  if (work) {
    work.style.transform = `translateY(${(1 - current) * 100}%)`;
    work.style.opacity = Math.min(1, current * 1.2);
  }

  current <= 0.02 ? resumeHero() : pauseHero();

  requestAnimationFrame(desktopLoop);
}

/* ==========================================================
   RESET TO HERO ON LOAD
   ========================================================== */

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  mPos = 0;
  mVel = 0;
  snapActive = false;
  resumeHero();
});

/* ==========================================================
   INIT
   ========================================================== */

requestAnimationFrame(mobileLoop);
desktopLoop();
