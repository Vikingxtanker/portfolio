/* ==========================================================
   scroll-work.js
   - Desktop: NO rubber band, direct snap
   - Mobile: iOS-style rubber band + snap
   - 50% strict decision rule
   ========================================================== */

let pos = 0;        // physics position
let current = 0;    // smoothed render position
let vel = 0;

let lastTouchY = null;
let isTouching = false;
let lastInputAt = performance.now();

/* ===================== DEVICE ===================== */

const isMobile = window.matchMedia('(max-width: 767px)').matches;

/* ===================== TUNING ===================== */

/* velocities */
const WHEEL_SENS_DESKTOP = 0.0009; // desktop
const TOUCH_SENS_MOBILE  = 0.0011; // mobile

/* physics */
const MAX_VEL     = 1.2;
const GLOBAL_DAMP = 0.92;

/* rubber band (MOBILE ONLY) */
const RUBBER_STIFF = 0.14;
const RUBBER_DAMP  = 0.82;

/* snap behavior */
const SNAP_IDLE_MS = 120;
const SNAP_FORCE   = 0.12;

/* visual smoothing */
const SMOOTH = 0.06;

/* ===================== ELEMENTS ===================== */

const hero  = document.querySelector('canvas');
const work  = document.getElementById('work');
const title = document.querySelector('.work-heading');
const lines = document.querySelectorAll('.work-nav li');

/* ===================== HELPERS ===================== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const resistance = o => 1 / (1 + Math.abs(o) * 6);

/* ===================== INPUT ===================== */

/* DESKTOP WHEEL (NO RUBBER) */
window.addEventListener('wheel', e => {
  vel += e.deltaY * WHEEL_SENS_DESKTOP;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
  lastInputAt = performance.now();
}, { passive: true });

/* MOBILE TOUCH (RUBBER ENABLED) */
window.addEventListener('touchstart', e => {
  if (!e.touches.length) return;
  lastTouchY = e.touches[0].clientY;
  isTouching = true;
  vel *= 0.6;
  lastInputAt = performance.now();
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!e.touches.length || lastTouchY === null) return;

  const y = e.touches[0].clientY;
  const delta = lastTouchY - y;
  lastTouchY = y;

  let deltaPos = delta * TOUCH_SENS_MOBILE;

  /* rubber band ONLY on mobile */
  if (isMobile) {
    const overTop = Math.min(0, pos);
    const overBot = Math.max(0, pos - 1);

    if (overTop < 0 && deltaPos < 0) deltaPos *= resistance(overTop);
    if (overBot > 0 && deltaPos > 0) deltaPos *= resistance(overBot);
  }

  vel += deltaPos;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
  lastInputAt = performance.now();
}, { passive: true });

window.addEventListener('touchend', () => {
  lastTouchY = null;
  isTouching = false;
  lastInputAt = performance.now();
});

/* ===================== LOOP ===================== */

function loop() {

  /* ---------- RUBBER BAND (MOBILE ONLY) ---------- */
  if (isMobile) {
    if (pos < 0) {
      vel += -pos * RUBBER_STIFF;
      vel *= RUBBER_DAMP;
    } 
    else if (pos > 1) {
      vel += -(pos - 1) * RUBBER_STIFF;
      vel *= RUBBER_DAMP;
    }
  } else {
    /* desktop: hard clamp (no elastic feel) */
    pos = clamp(pos, 0, 1);
  }

  /* ---------- STRICT 50% SNAP ---------- */
  const idle = performance.now() - lastInputAt;

  if (!isTouching && idle > SNAP_IDLE_MS && Math.abs(vel) < 0.03) {
    const render = clamp(current, 0, 1);
    const target = render < 0.5 ? 0 : 1;
    vel += (target - pos) * SNAP_FORCE;
  }

  /* ---------- INTEGRATE ---------- */
  vel *= GLOBAL_DAMP;
  pos += vel;

  /* desktop never overshoots */
  pos = isMobile ? clamp(pos, -0.9, 1.9) : clamp(pos, 0, 1);

  /* smooth render value */
  current += (pos - current) * SMOOTH;

  /* ---------- CLEAN RENDER STATE ---------- */
  const render = clamp(current, 0, 1);

  /* ===================== RENDER ===================== */

  if (hero) {
    hero.style.transform = `translateY(${-render * 22}vh)`;
    hero.style.opacity = render === 1 ? 0 : 1 - render;
  }

  if (work) {
    work.style.transform = `translateY(${(1 - render) * 100}%)`;
    work.style.opacity = render === 0 ? 0 : render;
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
