// js/hero-bg-control.js
(() => {
  const body = document.body;
  const work = document.querySelector('.work-screen');

  if (!work) return;

  let pageVisible = document.visibilityState === 'visible';

  /* -----------------------------
     Helpers
  ----------------------------- */

  function pause() {
    body.classList.add('bg-animation-paused');
  }

  function resume() {
    body.classList.remove('bg-animation-paused');
  }

  function getTranslateYPercent(el) {
    const style = window.getComputedStyle(el);
    const transform = style.transform;

    if (!transform || transform === 'none') return 100;

    const match = transform.match(/matrix.*\((.+)\)/);
    if (!match) return 100;

    const values = match[1].split(',').map(Number);
    const translateY = values[5] || 0;
    const viewportH = window.innerHeight;

    return (translateY / viewportH) * 100;
  }

  function update() {
    if (!pageVisible) {
      pause();
      return;
    }

    const workY = getTranslateYPercent(work);

    // 🔑 HERO VISIBLE ONLY WHEN WORK IS FULLY OFFSCREEN
    if (workY >= 99) {
      resume();   // hero visible → animate
    } else {
      pause();    // work coming in → stop animation
    }
  }

  /* -----------------------------
     Page visibility (tab switch)
  ----------------------------- */

  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState === 'visible';
    update();
  });

  /* -----------------------------
     Scroll / animation monitoring
     (polling is intentional here)
  ----------------------------- */

  let rafId = null;

  function loop() {
    update();
    rafId = requestAnimationFrame(loop);
  }

  loop();

})();
