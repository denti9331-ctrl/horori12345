'use strict';

(() => {
  const intro = document.querySelector('.intro');
  if (!intro) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const home = { x: 0.52, y: 0.43 };
  const target = { ...home };
  const current = { ...home };
  let frame = 0;
  let lastTime = 0;
  let bounds = intro.getBoundingClientRect();

  function paint() {
    intro.style.setProperty('--light-x', `${(current.x * 100).toFixed(3)}%`);
    intro.style.setProperty('--light-y', `${(current.y * 100).toFixed(3)}%`);
    const x = (current.x - home.x) * 2;
    const y = (current.y - home.y) * 2;
    // Keep the background and tree silhouette locked to one coordinate system.
    intro.style.setProperty('--scene-x', `${(x * -1.5).toFixed(2)}px`);
    intro.style.setProperty('--scene-y', `${(y * -1).toFixed(2)}px`);
    intro.style.setProperty('--shadow-x', `${(x * -5).toFixed(2)}px`);
    intro.style.setProperty('--shadow-y', `${(y * -3.5).toFixed(2)}px`);
  }

  function animate(time) {
    frame = 0;
    const elapsed = lastTime ? Math.min(time - lastTime, 50) : 16.67;
    lastTime = time;
    const ease = 1 - Math.exp(-elapsed / 125);
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    const settled = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) < 0.00015;
    if (settled) Object.assign(current, target);
    paint();
    if (!settled) frame = requestAnimationFrame(animate);
    else lastTime = 0;
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function reset() {
    intro.dataset.pointer = 'false';
    Object.assign(target, home);
    if (reducedMotion.matches || !finePointer.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      Object.assign(current, home);
      paint();
    } else schedule();
  }

  intro.addEventListener('pointerenter', () => {
    bounds = intro.getBoundingClientRect();
  }, { passive: true });

  intro.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || !finePointer.matches || reducedMotion.matches) return;
    target.x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    target.y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    const interactive = event.target.closest('a, button, input, select, textarea, [role="button"]');
    intro.dataset.pointer = String(!interactive);
    schedule();
  }, { passive: true });

  intro.addEventListener('pointerleave', reset, { passive: true });
  intro.addEventListener('pointercancel', reset, { passive: true });
  window.addEventListener('blur', reset);
  window.addEventListener('resize', () => { bounds = intro.getBoundingClientRect(); }, { passive: true });
  window.addEventListener('scroll', () => { bounds = intro.getBoundingClientRect(); }, { passive: true });
  reducedMotion.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    } else reset();
  });

  const background = intro.querySelector('.intro__background');
  const reportImageError = () => { intro.querySelector('.intro__error').hidden = false; };
  background.addEventListener('error', reportImageError, { once: true });
  if (background.complete && !background.naturalWidth) reportImageError();
  paint();
})();
