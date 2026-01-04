/* ==========================================================
   Work Preview Controller (FIXED + ADAPTIVE VIDEO + MOBILE CLONE)
   - Desktop: hover → floating preview
   - Mobile: click → modal popup (cloned node for exact visuals)
   - Auto aspect-ratio support (16:9 / 9:16 / any)
   ========================================================== */

(() => {
  const items = document.querySelectorAll('.work-nav li');
  const previewNodes = document.querySelectorAll('.work-right .preview');

  if (!items.length || !previewNodes.length) return;

  /* ===== MOVE PREVIEWS TO BODY (preview-layer) ===== */
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
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  /* ===== VIDEO HELPERS ===== */
  function playVideo(preview) {
    const video = preview.querySelector('video');
    if (video) {
      try {
        video.currentTime = 0;
      } catch (err) {}
      // try play; ignore promise rejection
      video.play && video.play().catch(() => {});
    }
  }

  function pauseAndResetVideo(preview) {
    const video = preview.querySelector('video');
    if (video) {
      try { video.pause(); } catch (e) {}
      try { video.currentTime = 0; } catch (e) {}
    }
  }

  function applyVideoAspect(preview) {
    const video = preview.querySelector('video');
    const box = preview.querySelector('.preview-box');
    if (!video || !box) return;

    const apply = () => {
      const aspect = video.videoWidth && video.videoHeight ? (video.videoWidth / video.videoHeight) : null;
      if (aspect) box.style.setProperty('--aspect', aspect);
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
      pauseAndResetVideo(activePreview);
      activePreview.classList.remove('active');
    }

    activeItem = null;
    activePreview = null;
  }

  /* ===== MOBILE MODAL (cloneNode version to preserve elements) ===== */
  function openModal(item) {
    const id = item.dataset.preview;
    const preview = document.getElementById(id);
    if (!preview) return;

    // create overlay + modal
    const overlay = document.createElement('div');
    overlay.className = 'work-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'work-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'work-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close preview');

    const content = document.createElement('div');
    content.className = 'work-modal-content';

    // clone the preview node (deep clone) to preserve the video element and attributes
    const clonedPreview = preview.cloneNode(true);

    // If the clone has an id, remove it to avoid duplicates
    if (clonedPreview.id) clonedPreview.removeAttribute('id');

    // ensure classes match modal styling
    // move only the inner .preview-box into modal content to avoid absolute positioning conflicts
    const clonedBox = clonedPreview.querySelector('.preview-box') || clonedPreview;
    content.appendChild(clonedBox);

    modal.appendChild(closeBtn);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // prevent background scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('_preview-modal-open');

    // Prepare and play video (if any)
    requestAnimationFrame(() => {
      const video = content.querySelector('video');
      if (video) {
        // ensure mobile-friendly attributes
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');

        // ensure styling
        video.style.objectFit = 'contain';
        video.style.width = '100%';
        video.style.height = 'auto';
        video.style.background = '#000';

        const apply = () => {
          const aspect = video.videoWidth && video.videoHeight ? (video.videoWidth / video.videoHeight) : null;
          if (aspect && clonedBox) clonedBox.style.setProperty('--aspect', aspect);
        };

        if (video.videoWidth) apply();
        else video.addEventListener('loadedmetadata', apply, { once: true });

        // Reset to start and try play
        try { video.currentTime = 0; } catch (e) {}
        video.play && video.play().catch(() => {});
      }
    });

    // close logic: pause/reset video and remove overlay
    function close() {
      // pause/reset any video inside overlay
      const v = overlay.querySelector('video');
      if (v) {
        try { v.pause(); } catch (e) {}
        try { v.currentTime = 0; } catch (e) {}
      }

      document.documentElement.style.overflow = '';
      document.body.classList.remove('_preview-modal-open');
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

  /* ===== EVENTS (keyboard + mouse + touch friendly) ===== */
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

  /* ===== FOLLOW LOOP (desktop floating preview follows cursor) ===== */
  function followLoop() {
    if (activePreview) {
      px += (mouseX - px) * 0.08;
      py += (mouseY - py) * 0.08;

      // offset so preview is slightly to the right & above the cursor
      const x = px + Math.min(window.innerWidth * 0.12, 180);
      const y = py - 140;

      activePreview.style.transform = `translate(${x}px, ${y}px) scale(1)`;
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
