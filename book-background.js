// The still image remains behind the video, including on loading/playback failure.
(() => {
  const scene = document.querySelector('#book-scene');
  const video = scene?.querySelector('.book-background-video');
  if (!video) return;
  let visible = false;
  let failed = false;
  let framePending = false;
  video.muted = true;
  video.pause();
  const sync = () => {
    if (failed || !visible || document.hidden) { video.pause(); return; }
    video.play().then(() => {
      if (!visible || document.hidden) video.pause();
    }).catch(() => {});
  };
  const reveal = () => {
    framePending = false;
    if (!failed) video.classList.add('is-ready');
  };
  video.addEventListener('playing', () => {
    if (framePending || failed) return;
    if ('requestVideoFrameCallback' in video) {
      framePending = true;
      video.requestVideoFrameCallback(reveal);
    } else if (video.readyState >= 2) reveal();
  });
  video.addEventListener('error', () => {
    failed = true;
    video.classList.remove('is-ready');
    video.pause();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(scene);
  } else {
    const check = () => {
      const rect = scene.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < innerHeight;
      sync();
    };
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; check(); });
    };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    check();
  }
  document.addEventListener('visibilitychange', sync);
  scene.addEventListener('pointerdown', sync, { passive: true });
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', () => video.pause());
})();
