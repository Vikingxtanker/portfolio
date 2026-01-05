/* ==========================================================
   scroll-work2.js — IMMEDIATE FINGER TRACKING + SMOOTH SNAP
   - Finger tracks content 1:1 while touching
   - Momentum (mVel), damping and snap behavior unchanged
   - Force reset to hero on reload
   ========================================================== */

/* Disable browser scroll restoration so reload always starts at top */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

/* CORE STATE */
let target = 0;
let current = 0;
let velocity = 0;

/* elements */
const hero = document.querySelector('canvas');
const work = document.getElementById('work');

const MOBILE_BREAKPOINT = 767;
const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

/* HERO PAUSE / RESUME */
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

/* DESKTOP INPUT (unchanged) */
window.addEventListener(
  'wheel',
  e => {
    if (isMobile()) return;
    pauseHero();
    velocity += e.deltaY * 0.0009;
  },
  { passive: true }
);

/* MOBILE STATE */
let mPos = window.scrollY; // track current scroll pos
let mVel = 0;
let mTouching = false;

/* snap animation state */
let snapActive = false;
let snapStart = 0;
let snapFrom = 0;
let snapTo = 0;

/* tuning */
const INPUT_FORCE = 0.35;   // momentum scaling (keeps your existing feel)
const DAMPING = 0.85;
const STOP_VELOCITY = 0.06;
const SNAP_THRESHOLD = 0.5;
const SNAP_DURATION = 750;  // ms
const MAX_VELOCITY = 40;    // px per frame cap

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

/* MOBILE INPUT - now with immediate finger-following */
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
    const dy = lastY - y; // positive when moving finger up

    // 1) IMMEDIATE 1:1 FOLLOW — update mPos so content sits under user's finger
    mPos += dy;

    // clamp mPos to document bounds immediately to avoid overscroll artifacts
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    mPos = Math.max(0, Math.min(maxScroll, mPos));

    // 2) KEEP momentum system intact — update mVel (this preserves snap + glide feel)
    mVel += dy * INPUT_FORCE;

    // clamp velocity to avoid rocket flicks
    mVel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, mVel));

    // 3) immediate visual feedback (don't wait for next frame)
    window.scrollTo(0, mPos);

    lastY = y;
  },
  { passive: true }
);

window.addEventListener('touchend', () => {
  if (!isMobile()) return;
  mTouching = false;
  lastY = null;
});

/* MOBILE LOOP — immediate glide + snap */
function mobileLoop(ts) {
  if (!isMobile()) {
    requestAnimationFrame(mobileLoop);
    return;
  }

  /* when not snapping, apply momentum/damping to mPos */
  if (!snapActive) {
    mVel *= DAMPING;
    mPos += mVel;

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    mPos = Math.max(0, Math.min(maxScroll, mPos));

    /* decide snap immediately after velocity dies and touch ended */
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

  /* glide snap if active */
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

/* DESKTOP LOOP (unchanged visuals) */
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

/* HARD RESET TO HERO ON PAGE LOAD */
function resetToTop() {
  window.scrollTo(0, 0);

  /* reset mobile */
  mPos = 0;
  mVel = 0;
  mTouching = false;
  snapActive = false;

  /* reset desktop */
  target = 0;
  current = 0;
  velocity = 0;

  resumeHero();
}
window.addEventListener('load', resetToTop);

/* INIT */
requestAnimationFrame(mobileLoop);
desktopLoop();
