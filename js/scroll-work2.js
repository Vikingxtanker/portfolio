/* ==========================================================
   scroll-work.js
   FINAL STABLE VERSION
   - No faded ghost state
   - Immediate commit on release
   - Android rubber + hero rebound
   - Desktop rigid
   ========================================================== */

let pos = 0;        // physics position (can overshoot)
let current = 0;    // smoothed position
let vel = 0;

let lastTouchY = null;
let lastDelta = 0;
let isTouching = false;
let commitTarget = null; // 0 = hero, 1 = work

/* ===================== DEVICE ===================== */

const isAndroid = /Android/i.test(navigator.userAgent);
const isTouch   = 'ontouchstart' in window;

/* ===================== TUNING ===================== */

const WHEEL_SENS_DESKTOP = 0.0009;
const TOUCH_SENS_MOBILE  = 0.0022;

const MAX_VEL = 1.8;

/* damping */
const DAMP_DESKTOP = 0.92;
const DAMP_MOBILE  = 0.88;

/* Android rubber */
const RUBBER_STIFF = 0.18;

/* hero rebound */
const HERO_REBOUND_ZONE  = 0.08;
const HERO_REBOUND_FORCE = 0.38;

/* snap */
const SNAP_FORCE = 0.12;

/* smoothing */
const SMOOTH = 0.06;

/* overscroll visibility */
const OVER_SCROLL_LIMIT = 0.55;

/* ===================== ELEMENTS ===================== */

const hero  = document.querySelector('canvas');
const work  = document.getElementById('work');
const title = document.querySelector('.work-heading');
const lines = document.querySelectorAll('.work-nav li');

/* ===================== HELPERS ===================== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const resistance = o => 1 / (1 + Math.abs(o) * 6);

/* ===================== INPUT ===================== */

/* DESKTOP WHEEL */
window.addEventListener('wheel', e => {
  vel += e.deltaY * WHEEL_SENS_DESKTOP;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
}, { passive: true });

/* TOUCH START */
window.addEventListener('touchstart', e => {
  if (!e.touches.length) return;
  lastTouchY = e.touches[0].clientY;
  lastDelta = 0;
  isTouching = true;
  vel *= 0.35;
}, { passive: true });

/* TOUCH MOVE */
window.addEventListener('touchmove', e => {
  if (!e.touches.length || lastTouchY === null) return;

  const y = e.touches[0].clientY;
  const delta = lastTouchY - y;
  lastTouchY = y;
  lastDelta = delta;

  let deltaPos = delta * TOUCH_SENS_MOBILE;

  if (isAndroid && isTouch) {
    const overTop = Math.min(0, pos);
    const overBot = Math.max(0, pos - 1);

    if (overTop < 0 && deltaPos < 0) deltaPos *= resistance(overTop);
    if (overBot > 0 && deltaPos > 0) deltaPos *= resistance(overBot);
  }

  vel += deltaPos;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
}, { passive: true });

/* TOUCH END — DECIDE IMMEDIATELY */
window.addEventListener('touchend', () => {
  isTouching = false;
  lastTouchY = null;

  const render = clamp(current, 0, 1);

  /* velocity override for flicks */
  if (Math.abs(lastDelta) > 10) {
    commitTarget = lastDelta > 0 ? 1 : 0;
  } else {
    commitTarget = render >= 0.5 ? 1 : 0;
  }

  /* hero rebound impulse */
  if (
    isAndroid &&
    commitTarget === 1 &&
    pos < HERO_REBOUND_ZONE
  ) {
    vel -= HERO_REBOUND_FORCE;
  }
});

/* ===================== LOOP ===================== */

function loop() {

  /* ANDROID RUBBER FORCE */
  if (isAndroid && isTouch) {
    if (pos < 0) vel += -pos * RUBBER_STIFF;
    else if (pos > 1) vel += -(pos - 1) * RUBBER_STIFF;
  }

  /* COMMITTED SNAP — NO AMBIGUITY */
  if (!isTouching && commitTarget !== null) {
    vel += (commitTarget - pos) * SNAP_FORCE;

    if (Math.abs(commitTarget - pos) < 0.002) {
      pos = commitTarget;
      vel = 0;
      commitTarget = null;
    }
  }

  /* INTEGRATE */
  vel *= isTouch ? DAMP_MOBILE : DAMP_DESKTOP;
  pos += vel;

  /* allow visible overscroll only on Android */
  pos = (isAndroid && isTouch)
    ? clamp(pos, -OVER_SCROLL_LIMIT, 1 + OVER_SCROLL_LIMIT)
    : clamp(pos, 0, 1);

  /* SMOOTH */
  current += (pos - current) * SMOOTH;

  const render = clamp(current, 0, 1);

  /* ===================== RENDER ===================== */

  if (hero) {
    hero.style.transform = `translateY(${-render * 22}vh)`;
    hero.style.opacity = 1 - render;
  }

  if (work) {
    work.style.transform = `translateY(${(1 - render) * 100}%)`;
    work.style.opacity = render;
  }

  if (title) {
    const p = Math.min(1, Math.max(0, (render - 0.15) * 6));
    title.style.opacity = p;
    title.style.transform = `translateY(${(1 - p) * 12}px)`;
  }

  lines.forEach((li, i) => {
    const delay = 0.22 + i * 0.06;
    const p = Math.min(1, Math.max(0, (render - delay) * 6));
    li.style.opacity = p;
    li.style.transform = `translateY(${(1 - p) * 14}px)`;
  });

  requestAnimationFrame(loop);
}

loop();

/* ================= DISABLE MOBILE PULL TO REFRESH ================= */

let startY = 0;

window.addEventListener('touchstart', e => {
  if (e.touches.length === 1) startY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', e => {
  const y = e.touches[0].clientY;
  if (window.scrollY === 0 && y > startY) {
    e.preventDefault();
  }
}, { passive: false });
