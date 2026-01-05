/* ==========================================================
   scroll-work2.js — IMMEDIATE SMOOTH SNAP (NO COAST)
   Clean glide, no pause, no spring
   ========================================================== */

let target = 0;
let current = 0;
let velocity = 0;

/* elements */
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

let mPos = window.scrollY;
let mVel = 0;
let mTouching = false;

/* snap animation */
let snapActive = false;
let snapStart = 0;
let snapFrom = 0;
let snapTo = 0;

/* tuning */
const INPUT_FORCE = 0.35;
const DAMPING = 0.85;
const STOP_VELOCITY = 0.06;
const SNAP_THRESHOLD = 0.5;
const SNAP_DURATION = 750; // 🔑 slow, smooth glide (ms)

/* easing */
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/* helpers */
function getWorkRatio() {
  const r = work.getBoundingClientRect();
  const vh = window.innerHeight;
  return Math.max(
    0,
    Math.min(1, (Math.min(vh, r.bottom) - Math.max(0, r.top)) / vh)
  );
}

/* ==========================================================
   MOBILE INPUT
   ========================================================== */

let lastY = null;

window.addEventListener(
  'touchstart',
  e => {
    if (!isMobile()) return;
    mTouching = true;
    snapActive = false;
    pauseHero();
    mVel = 0;
    lastY = e.touches[0].clientY;
  },
  { passive: true }
);

window.addEventListener(
  'touchmove',
  e => {
    if (!isMobile() || !mTouching) return;
    const y = e.touches[0].clientY;
    mVel += (lastY - y) * INPUT_FORCE;
    lastY = y;
  },
  { passive: true }
);

window.addEventListener('touchend', () => {
  if (!isMobile()) return;
  mTouching = false;
  lastY = null;
});

/* ==========================================================
   MOBILE LOOP — IMMEDIATE GLIDE SNAP
   ========================================================== */

function mobileLoop(ts) {
  if (!isMobile()) {
    requestAnimationFrame(mobileLoop);
    return;
  }

  /* manual scrolling */
  if (!snapActive) {
    mVel *= DAMPING;
    mPos += mVel;

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    mPos = Math.max(0, Math.min(maxScroll, mPos));

    /* decide snap immediately after stop */
    if (!mTouching && Math.abs(mVel) < STOP_VELOCITY) {
      const ratio = getWorkRatio();

      snapActive = true;
      snapStart = ts;
      snapFrom = mPos;
      snapTo = ratio >= SNAP_THRESHOLD ? work.offsetTop : 0;
      mVel = 0;

      if (snapTo !== 0) pauseHero();
    }
  }

  /* glide snap */
  if (snapActive) {
    const t = Math.min(1, (ts - snapStart) / SNAP_DURATION);
    const eased = easeOutCubic(t);
    mPos = snapFrom + (snapTo - snapFrom) * eased;

    if (t >= 1) {
      snapActive = false;
      mPos = snapTo;

      if (snapTo === 0) resumeHero();
    }
  }

  window.scrollTo(0, mPos);
  requestAnimationFrame(mobileLoop);
}

/* ==========================================================
   DESKTOP LOOP (UNCHANGED VISUALS)
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

  target = Math.max(0, Math.min(1, target));
  current += (target - current) * 0.08;

  if (hero) {
    hero.style.transform = `translateY(${-current * 22}vh)`;
    hero.style.opacity = 1 - current * 1.1;
  }

  if (work) {
    work.style.transform = `translateY(${(1 - current) * 100}%)`;
    work.style.opacity = Math.min(1, current * 1.2);
  }

  if (current <= 0.02) resumeHero();
  else pauseHero();

  requestAnimationFrame(desktopLoop);
}

/* ==========================================================
   INIT
   ========================================================== */

requestAnimationFrame(mobileLoop);
desktopLoop();
