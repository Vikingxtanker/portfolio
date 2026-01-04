/* ==========================================================
   scroll-work2.js
   ANDROID VELOCITY SCROLL (FINAL)
   - Android ONLY
   - Velocity-based commit
   - No fading ghost state
   - Proper rubber band + rebound
   ========================================================== */

let pos = 0;        // physics position (can overshoot)
let current = 0;    // smoothed render position
let vel = 0;

let lastTouchY = null;
let isTouching = false;
let commitTarget = null;

/* ===================== DEVICE ===================== */

const isAndroid = /Android/i.test(navigator.userAgent);
const isTouch   = 'ontouchstart' in window;

/* ❌ HARD EXIT FOR DESKTOP */
if (!isAndroid || !isTouch) {
  console.log('[scroll] Desktop detected — disabled');
  throw new Error('Scroll physics disabled on desktop');
}

/* ===================== TUNING ===================== */

/* touch */
const TOUCH_SENS = 0.0024;
const MAX_VEL    = 2.2;

/* damping */
const DAMPING = 0.90;

/* rubber band */
const RUBBER_STIFF = 0.18;
const OVER_SCROLL  = 0.55;

/* snap */
const SNAP_FORCE  = 0.14;

/* velocity thresholds */
const FLICK_MIN   = 0.035;
const FLICK_STRONG = 0.09;

/* smoothing */
const SMOOTH = 0.07;

/* hero rebound */
const HERO_REBOUND_ZONE  = 0.09;
const HERO_REBOUND_FORCE = 0.42;

/* ===================== ELEMENTS ===================== */

const hero  = document.querySelector('canvas');
const work  = document.getElementById('work');
const title = document.querySelector('.work-heading');
const lines = document.querySelectorAll('.work-nav li');

/* ===================== HELPERS ===================== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const resistance = o => 1 / (1 + Math.abs(o) * 6);

/* ===================== TOUCH INPUT ===================== */

window.addEventListener('touchstart', e => {
  if (!e.touches.length) return;

  lastTouchY = e.touches[0].clientY;
  isTouching = true;
  commitTarget = null;

  /* soften carry-over velocity */
  vel *= 0.25;
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!e.touches.length || lastTouchY === null) return;

  const y = e.touches[0].clientY;
  const delta = lastTouchY - y;
  lastTouchY = y;

  let deltaPos = delta * TOUCH_SENS;

  /* rubber resistance */
  const overTop = Math.min(0, pos);
  const overBot = Math.max(0, pos - 1);

  if (overTop < 0 && deltaPos < 0) deltaPos *= resistance(overTop);
  if (overBot > 0 && deltaPos > 0) deltaPos *= resistance(overBot);

  vel += deltaPos;
  vel = clamp(vel, -MAX_VEL, MAX_VEL);
}, { passive: true });

/* ===================== RELEASE — VELOCITY DECIDES ===================== */

window.addEventListener('touchend', () => {
  isTouching = false;
  lastTouchY = null;

  const v = vel;

  /* STRONG flick */
  if (Math.abs(v) > FLICK_STRONG) {
    commitTarget = v > 0 ? 1 : 0;
  }

  /* normal flick */
  else if (Math.abs(v) > FLICK_MIN) {
    commitTarget = v > 0 ? 1 : 0;
  }

  /* no flick → stay nearest */
  else {
    commitTarget = pos > 0.5 ? 1 : 0;
  }

  /* hero rebound impulse */
  if (commitTarget === 1 && pos < HERO_REBOUND_ZONE) {
    vel -= HERO_REBOUND_FORCE;
  }
});

/* ===================== LOOP ===================== */

function loop() {

  /* rubber pull-back */
  if (pos < 0) vel += -pos * RUBBER_STIFF;
  else if (pos > 1) vel += -(pos - 1) * RUBBER_STIFF;

  /* committed snap */
  if (!isTouching && commitTarget !== null) {
    vel += (commitTarget - pos) * SNAP_FORCE;

    if (Math.abs(commitTarget - pos) < 0.002) {
      pos = commitTarget;
      vel = 0;
      commitTarget = null;
    }
  }

  /* integrate */
  vel *= DAMPING;
  pos += vel;

  /* allow visible overscroll */
  pos = clamp(pos, -OVER_SCROLL, 1 + OVER_SCROLL);

  /* smooth render */
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

/* ================= DISABLE ANDROID PULL TO REFRESH ================= */

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
