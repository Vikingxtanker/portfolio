let target = 0;
let current = 0;
let velocity = 0;

/* elements */
const hero = document.querySelector('canvas');
const work = document.getElementById('work');
const title = document.querySelector('.work-title');
const lines = document.querySelectorAll('.work-list li');

/* ================= INPUT ================= */

/* desktop wheel */
window.addEventListener('wheel', e => {
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

  velocity += delta * 0.0025;   // tuned for mobile
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
  hero.style.transform = `translateY(${-current * 22}vh)`;
  hero.style.opacity = 1 - current * 1.1;

  /* work */
  work.style.transform = `translateY(${(1 - current) * 100}%)`;
  work.style.opacity = Math.min(1, current * 1.2);

  /* title */
  title.style.opacity = Math.min(1, (current - 0.15) * 6);
  title.style.transform =
    `translateY(${(1 - Math.min(1, (current - 0.15) * 6)) * 12}px)`;

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
