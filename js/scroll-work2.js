/* ==========================================================
   scroll-work2.js — DESKTOP ONLY + VELOCITY-DRIVEN SNAP
   Lenis handles mobile scrolling + inertia
   Snap blends naturally with momentum
   ========================================================== */

/* Disable browser scroll restoration */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

/* ==========================================================
   CORE STATE (DESKTOP ONLY)
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
   VELOCITY-DRIVEN SNAP (MOBILE — LENIS)
   ========================================================== */

let snapping = false;

if (typeof lenis !== 'undefined') {
  lenis.on('scroll', ({ velocity }) => {
    if (snapping) return;

    const v = Math.abs(velocity);

    /* still moving fast → let inertia continue */
    if (v > 0.15) return;

    const vh = window.innerHeight;
    const rect = work.getBoundingClientRect();

    const visibleRatio =
      (Math.min(vh, rect.bottom) - Math.max(0, rect.top)) / vh;

    const goingDown = velocity > 0;

    let snapTarget;
    if (visibleRatio > 0.5 || (goingDown && visibleRatio > 0.35)) {
      snapTarget = work;
    } else {
      snapTarget = 0;
    }

    /* duration flows with remaining velocity */
    const duration = Math.min(
      1.05,
      Math.max(0.45, v * 2.2)
    );

    snapping = true;

    lenis.scrollTo(snapTarget, {
      duration,
      easing: t => 1 - Math.pow(1 - t, 3),
      onComplete: () => {
        snapping = false;
      }
    });
  });
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

  current <= 0.02 ? resumeHero() : pauseHero();
  requestAnimationFrame(desktopLoop);
}

/* ==========================================================
   RESET TO HERO ON LOAD
   ========================================================== */

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  resumeHero();
});

/* ==========================================================
   INIT
   ========================================================== */

desktopLoop();
