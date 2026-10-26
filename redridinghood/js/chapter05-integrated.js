'use strict';
(() => {
  const chapter = document.querySelector('.epilogue');
  if (!chapter || !('IntersectionObserver' in window)) return;
  const passages = [...document.querySelectorAll('.passage, .last-page')];
  (chapter.closest('.chapter05') || document.documentElement).classList.add('reveal-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('active', entry.isIntersecting);
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        if (entry.target.dataset.stage) chapter.dataset.current = entry.target.dataset.stage;
      }
    }
  }, { rootMargin: '-25% 0px -25% 0px', threshold: 0 });
  passages.forEach(passage => observer.observe(passage));
})();
