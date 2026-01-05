// js/hero-bg-control.js
(() => {
  const body = document.body;
  const work = document.querySelector('.work-screen');

  if (!work) return;

  let pageVisible = document.visibilityState === 'visible';
  let rafId = null;

  /* -----------------------------
     Helpers
  ----------------------------- */

  function pause() {
    body.classList.add('bg-animation-paused');
  }

  function resume() {
    body.classList.remove('bg-animation-paused');
  }

  /* -----------------------------
     Event-driven pause / resume
     Listen for scroll-driven events from scroll-work.js
  ----------------------------- */

  document.addEventListener('hero:pause', () => {
    pause();
  });

  document.addEventListener('hero:resume', () => {
    // Only resume when page visible
    if (pageVisible) resume();
  });

  /* -----------------------------
     Page visibility (tab switch)
  ----------------------------- */

  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState === 'visible';
    if (!pageVisible) {
      pause();
    } else {
      // only resume when not explicitly paused by scroll
      // scroll-work will re-fire hero:resume if appropriate
      // but as a fallback, resume if class not already paused
      if (!document.body.classList.contains('bg-animation-paused')) {
        resume();
      }
    }
  });

  /* -----------------------------
     Fallback polling (keeps previous behavior safe)
     We still check transform on desktop for robustness, but
     event-driven approach is primary.
  ----------------------------- */

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

    // As a safe fallback: if work is almost fully offscreen, allow animation
    const workY = getTranslateYPercent(work);
    if (workY >= 99) {
      // only resume if not purposely paused by scroll-work
      if (!document.body.classList.contains('bg-animation-paused')) resume();
    } else {
      pause();
    }
  }

  function loop() {
    update();
    rafId = requestAnimationFrame(loop);
  }

  loop();

})();
