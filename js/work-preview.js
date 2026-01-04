/* ==========================================================
   Work Preview Controller (FIXED + ADAPTIVE VIDEO)
   - Desktop: hover → floating preview
   - Mobile: click → modal popup
   - Auto aspect-ratio support (16:9 / 9:16 / any)
   ========================================================== */

(() => {
  const items = document.querySelectorAll('.work-nav li');
  const previewNodes = document.querySelectorAll('.work-right .preview');

  if (!items.length || !previewNodes.length) return;

  /* ===== MOVE PREVIEWS TO BODY ===== */
  const previewLayer = document.createElement('div');
  previewLayer.className = 'preview-layer';
  document.body.appendChild(previewLayer);
  previewNodes.forEach(p => previewLayer.appendChild(p));

  let activeItem = null;
  let activePreview = null;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let px = mouseX;
  let py = mouseY;

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  /* ===== TRACK CURSOR ===== */
  window.addEventListener(
    'mousemove',
    e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    },
    { passive: true }
  );

  /* ===== VIDEO HELPERS ===== */
  function playVideo(preview) {
    const video = preview.querySelector('video');
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }

  function stopVideo(preview) {
    const video = preview.querySelector('video');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  function applyVideoAspect(preview) {
    const video = preview.querySelector('video');
    const box = preview.querySelector('.preview-box');
    if (!video || !box) return;

    const apply = () => {
      const aspect = video.videoWidth / video.videoHeight;
      box.style.setProperty('--aspect', aspect);
    };

    if (video.videoWidth) apply();
    else video.addEventListener('loadedmetadata', apply, { once: true });
  }

  /* ===== DESKTOP PREVIEW ===== */
  function activateDesktop(item) {
    if (isMobile()) return;

    const id = item.dataset.preview;
    const preview = document.getElementById(id);
    if (!preview) return;

    deactivate();

    item.classList.add('active');
    preview.classList.add('active');

    applyVideoAspect(preview);
    playVideo(preview);

    px = mouseX;
    py = mouseY;

    activeItem = item;
    activePreview = preview;
  }

  function deactivate() {
    if (activeItem) activeItem.classList.remove('active');

    if (activePreview) {
      stopVideo(activePreview);
      activePreview.classList.remove('active');
    }

    activeItem = null;
    activePreview = null;
  }

  /* ===== MOBILE MODAL ===== */
  function openModal(item) {
    const id = item.dataset.preview;
    const preview = document.getElementById(id);
    if (!preview) return;

    const overlay = document.createElement('div');
    overlay.className = 'work-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'work-modal';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'work-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close preview');

    const content = document.createElement('div');
    content.className = 'work-modal-content';
    content.innerHTML = preview.innerHTML;

    modal.appendChild(closeBtn);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    /* ▶️ FORCE VIDEO PLAY + ASPECT ON MOBILE */
    requestAnimationFrame(() => {
      const video = content.querySelector('video');
      const box = content.querySelector('.preview-box');

      if (video && box) {
        video.muted = true;
        video.playsInline = true;

        const apply = () => {
          const aspect = video.videoWidth / video.videoHeight;
          box.style.setProperty('--aspect', aspect);
        };

        if (video.videoWidth) apply();
        else video.addEventListener('loadedmetadata', apply, { once: true });

        video.currentTime = 0;
        video.play().catch(() => {});
      }
    });

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    function close() {
      document.documentElement.style.overflow = prevOverflow || '';
      overlay.remove();
      window.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    window.addEventListener('keydown', onKey);
  }

  /* ===== EVENTS ===== */
  items.forEach(item => {
    item.tabIndex = 0;

    item.addEventListener('mouseenter', () => activateDesktop(item));
    item.addEventListener('mouseleave', deactivate);

    item.addEventListener('focus', () => activateDesktop(item));
    item.addEventListener('blur', deactivate);

    item.addEventListener('click', e => {
      if (isMobile()) {
        e.preventDefault();
        openModal(item);
      }
    });

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        isMobile() ? openModal(item) : activateDesktop(item);
      }
      if (e.key === 'Escape') deactivate();
    });
  });

  /* ===== FOLLOW LOOP ===== */
  function followLoop() {
    if (activePreview) {
      px += (mouseX - px) * 0.08;
      py += (mouseY - py) * 0.08;

      const x = px + Math.min(window.innerWidth * 0.12, 180);
      const y = py - 140;

      activePreview.style.transform =
        `translate(${x}px, ${y}px) scale(1)`;
    }
    requestAnimationFrame(followLoop);
  }
  followLoop();

  /* ===== SAFETY ===== */
  window.addEventListener('blur', deactivate);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) deactivate();
  });
})();
