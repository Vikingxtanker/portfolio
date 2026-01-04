/* ==========================================================
   scroll-work.js
   Mobile: easier scroll (1 swipe ≈ 1 section)
   Desktop: precise, no rubber band
   Strict 50% snap rule
   ========================================================== */

let pos = 0;
let current = 0;
let vel = 0;

let lastTouchY = null;
let isTouching = false;
let lastInputAt = performance.now();

/* ===================== DEVICE ===================== */

const isMobile = window.matchMedia('(max-width: 767px)').matches;

/* ===================== TUNING ===================== */

/* sensitivities */
const WHEEL_SENS_DESKTOP = 0.0009;

/* 🔑 MOBILE GAIN INCREASED */
const TOUCH_SENS_MOBILE  = 0.0022;  // ⬆️ was 0.0011 (2×)

/* physics */
const MAX_VEL = 1.6;

/* damping */
const GLOBAL_DAMP_DESKTOP = 0.92;
const GLOBAL_DAMP_MOBILE  = 0.88;   // ⬇️ less damping = easier travel

/* rubber band (mobile only) */
const RUBBER_STIFF = 0.14;
const RUBBER_DAMP  = 0.82;

/* snap */
const SNAP_IDLE_MS = 100;
const SNAP_FORCE   = 0.14;

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

/* DESKTOP WHEEL */
window.addEventListener('wheel', e => {
  vel += e.deltaY * WHEEL_SENS_DESKTOP;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
  lastInputAt = performance.now();
}, { passive: true });

/* MOBILE TOUCH */
window.addEventListener('touchstart', e => {
  if (!e.touches.length) return;
  lastTouchY = e.touches[0].clientY;
  isTouching = true;

  /* 🔑 boost initial momentum */
  vel *= 0.4;

  lastInputAt = performance.now();
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!e.touches.length || lastTouchY === null) return;

  const y = e.touches[0].clientY;
  const delta = lastTouchY - y;
  lastTouchY = y;

  let deltaPos = delta * TOUCH_SENS_MOBILE;

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

  /* ---- rubber band (mobile only) ---- */
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
    pos = clamp(pos, 0, 1);
  }

  /* ---- strict 50% snap ---- */
  const idle = performance.now() - lastInputAt;
  if (!isTouching && idle > SNAP_IDLE_MS && Math.abs(vel) < 0.05) {
    const render = clamp(current, 0, 1);
    const target = render < 0.5 ? 0 : 1;
    vel += (target - pos) * SNAP_FORCE;
  }

  /* ---- integrate ---- */
  vel *= isMobile ? GLOBAL_DAMP_MOBILE : GLOBAL_DAMP_DESKTOP;
  pos += vel;

  pos = isMobile
    ? clamp(pos, -0.9, 1.9)
    : clamp(pos, 0, 1);

  /* ---- smooth render ---- */
  current += (pos - current) * SMOOTH;

  /* ---- clean render state ---- */
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

window.addEventListener(
  'touchstart',
  e => {
    if (e.touches.length === 1) {
      startY = e.touches[0].clientY;
    }
  },
  { passive: true }
);

window.addEventListener(
  'touchmove',
  e => {
    const y = e.touches[0].clientY;
    const isPullingDown = y > startY;

    /* only block when at top */
    if (window.scrollY === 0 && isPullingDown) {
      e.preventDefault(); // ⛔ stops refresh
    }
  },
  { passive: false } // MUST be false to preventDefault
);
