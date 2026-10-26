(() => {
  const hero = document.querySelector('.main-intro');
  if (!hero) return;
  const intro = hero.querySelector('[data-petals-intro]');
  const loop = hero.querySelector('[data-petals-loop]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  intro.muted = true;
  loop.muted = true;
  loop.pause();
  let finished = false;
  let visible = true;
  let switching = false;
  const play = video => video.play().catch(() => {});
  const revealLoop = () => {
    // Keep the final intro frame underneath until the loop has a decoded frame.
    const reveal = () => {
      if (loop.paused || !finished) return;
      hero.classList.add('is-looping');
      intro.pause();
    };
    if (hero.classList.contains('is-looping')) return;
    if ('requestVideoFrameCallback' in loop) loop.requestVideoFrameCallback(reveal);
    else if (loop.readyState >= 2) reveal();
    else loop.addEventListener('loadeddata', reveal, { once: true });
  };
  loop.addEventListener('playing', revealLoop);
  const switchToLoop = () => {
    finished = true;
    if (switching || reduced.matches || !visible || document.hidden) return;
    switching = true;
    play(loop).finally(() => { switching = false; });
  };
  intro.addEventListener('ended', switchToLoop, { once: true });
  intro.addEventListener('error', switchToLoop, { once: true });
  const sync = () => {
    if (reduced.matches || !visible || document.hidden) {
      intro.pause(); loop.pause(); return;
    }
    if (finished) switchToLoop(); else play(intro);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  // Retry autoplay after a user gesture if browser policy blocked it.
  document.addEventListener('pointerdown', sync);
  window.addEventListener('pageshow', sync);
  document.querySelector('.main-intro__scroll').addEventListener('click', event => {
    event.preventDefault();
    document.querySelector('#book-scene').scrollIntoView({behavior:reduced.matches ? 'auto' : 'smooth'});
  });
  sync();
})();
