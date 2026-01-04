let target = 0;
let current = 0;
let velocity = 0;

/* elements — MATCH CURRENT HTML */
const hero  = document.querySelector('canvas');
const work  = document.getElementById('work');
const title = document.querySelector('.work-heading');
const lines = document.querySelectorAll('.work-nav li');

/* ================= INPUT ================= */

/* desktop wheel */
window.addEventListener('wheel', e => {
  /* DESKTOP SCROLL */
  velocity += e.deltaY * 0.0009;
}, { passive: true });

/* mobile touch */
let lastY = null;

window.addEventListener('touchstart', e => {
  lastY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (lastY === null) return;
  const y = e.touches[0].clientY;
  const delta = lastY - y;
  lastY = y;
  
  /* MOBILE SCROLL */
  velocity += delta * 0.00011;
  
    /* 🔒 clamp to avoid jump */
  velocity = Math.max(-0.08, Math.min(0.08, velocity));

}, { passive: true });

window.addEventListener('touchend', () => {
  lastY = null;
});

/* ================= LOOP ================= */

function loop() {
  target += velocity;
  velocity *= 0.82;

  /* snap */
  if (Math.abs(velocity) < 0.001) {
    target += (target > 0.5 ? 1 - target : -target) * 0.08;
  }

  target = Math.max(0, Math.min(1, target));
  current += (target - current) * 0.08;

  /* hero */
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

  requestAnimationFrame(loop);
}

loop();
