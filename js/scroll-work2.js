/* ==========================================================
   scroll-work2.js
   Android-only rubber band
   + HERO rebound even when refresh is disabled
   ========================================================== */

let pos = 0;
let current = 0;
let vel = 0;

let lastTouchY = null;
let isTouching = false;
let lastInputAt = performance.now();
let lastDelta = 0;

/* ===================== DEVICE ===================== */

const isAndroid = /Android/i.test(navigator.userAgent);
const isTouch   = 'ontouchstart' in window;

/* ===================== TUNING ===================== */

const WHEEL_SENS_DESKTOP = 0.0009;
const TOUCH_SENS_MOBILE  = 0.0022;

const MAX_VEL = 1.8;

/* damping */
const GLOBAL_DAMP_DESKTOP = 0.92;
const GLOBAL_DAMP_MOBILE  = 0.88;

/* rubber (ANDROID ONLY) */
const RUBBER_STIFF = 0.18;
const RUBBER_DAMP  = 0.78;

/* hero rebound */
const HERO_REBOUND_ZONE  = 0.06;   // how close to top
const HERO_REBOUND_FORCE = 0.58;   // bounce strength

/* snap */
const SNAP_IDLE_MS = 100;
const SNAP_FORCE   = 0.14;

/* smoothing */
const SMOOTH = 0.06;

/* overscroll limits */
const OVER_SCROLL_LIMIT = 0.85;

/* ===================== ELEMENTS ===================== */

const hero  = document.querySelector('canvas');
const work  = document.getElementById('work');
const title = document.querySelector('.work-heading');
const lines = document.querySelectorAll('.work-nav li');

/* ===================== HELPERS ===================== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const resistance = o => 1 / (1 + Math.abs(o) * 6);

/* ===================== INPUT ===================== */

/* DESKTOP */
window.addEventListener('wheel', e => {
  vel += e.deltaY * WHEEL_SENS_DESKTOP;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
  lastInputAt = performance.now();
}, { passive: true });

/* TOUCH START */
window.addEventListener('touchstart', e => {
  if (!e.touches.length) return;
  lastTouchY = e.touches[0].clientY;
  isTouching = true;
  vel *= 0.35;
  lastDelta = 0;
  lastInputAt = performance.now();
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
  lastInputAt = performance.now();
}, { passive: true });

/* TOUCH END */
window.addEventListener('touchend', () => {
  isTouching = false;
  lastTouchY = null;

  /* 🔑 HERO REBOUND IMPULSE */
  if (
    isAndroid &&
    pos < HERO_REBOUND_ZONE &&
    lastDelta < 0
  ) {
    vel -= HERO_REBOUND_FORCE;
  }

  lastInputAt = performance.now();
});

/* ===================== LOOP ===================== */

function loop() {

  /* ---- ANDROID RUBBER FORCE ---- */
  if (isAndroid && isTouch) {
    if (pos < 0) vel += -pos * RUBBER_STIFF;
    else if (pos > 1) vel += -(pos - 1) * RUBBER_STIFF;
  }

  /* ---- STRICT SNAP ---- */
  const idle = performance.now() - lastInputAt;
  if (!isTouching && idle > SNAP_IDLE_MS && Math.abs(vel) < 0.06) {
    const render = clamp(current, 0, 1);
    const target = render < 0.5 ? 0 : 1;
    vel += (target - pos) * SNAP_FORCE;
  }

  /* ---- INTEGRATE ---- */
  vel *= isTouch ? GLOBAL_DAMP_MOBILE : GLOBAL_DAMP_DESKTOP;
  pos += vel;

  pos = (isAndroid && isTouch)
    ? clamp(pos, -OVER_SCROLL_LIMIT, 1 + OVER_SCROLL_LIMIT)
    : clamp(pos, 0, 1);

  /* ---- SMOOTH ---- */
  current += (pos - current) * SMOOTH;

  /* ---- CLEAN RENDER ---- */
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
