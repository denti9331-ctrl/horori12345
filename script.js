// Native chapter navigation remains independent of the homepage archive.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

const archive = document.querySelector('.library-page .open-book');
if (archive) {
  const body = document.body;
  const stage = document.querySelector('.closed-book-stage');
  const trigger = document.querySelector('.book-trigger');
  const cover = document.querySelector('.book-cover');
  const physicalBook = document.querySelector('.book');
  const sheets = [...document.querySelectorAll('.book .page')];
  const cards = [...archive.querySelectorAll('.tale-card')];
  // Unequal starts/durations: dense initial flutter, readable final sheets.
  const sheetMotion = [
    [200, 300], [280, 310], [365, 315], [450, 320],
    [540, 330], [630, 335], [725, 340], [860, 370],
    [1010, 410], [1160, 420],
    [1340, 520], [1580, 700],
  ];
  // Stretch the paper timeline uniformly, preserving every overlap ratio.
  // The first sheet still starts at 200ms; cover speed is independent.
  const PAPER_TEMPO = 1.225;
  const FIRST_SHEET_START = sheetMotion[0][0];
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const smooth = (value) => value * value * (3 - 2 * value);
  let paperFrame = 0;
  let physicalLandingComplete = false;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svgNode = (tag, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  // One seamless path, one parchment pattern, and one broad light field per
  // physical sheet. Both faces reuse the same path and cached gradient.
  const createTurningPage = (sheet, index) => {
    const id = 'turning-paper-' + index;
    const depth = index === sheets.length - 1 ? 0 : 18 - index * 1.35;
    sheet.style.setProperty('--sheet-z', depth + 'px');
    const svg = svgNode('svg', { class: 'page-svg page-svg-front', viewBox: '0 0 1000 1400', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const defs = svgNode('defs');
    const texture = svgNode('pattern', { id: id + '-texture', patternUnits: 'userSpaceOnUse', width: 1000, height: 1400 });
    texture.append(svgNode('image', { href: './assets/book-bg.jpg', x: -1000, y: 0, width: 2000, height: 1400, preserveAspectRatio: 'none' }));
    const light = svgNode('linearGradient', { id: id + '-light', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1000, y2: 0 });
    const stops = [[0, '#402813', 0], [.35, '#39210e', .04], [.68, '#f3dfb1', .02], [1, '#bd9661', 0]].map(([offset, color, opacity]) => {
      const stop = svgNode('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }); light.append(stop); return stop;
    });
    const clip = svgNode('clipPath', { id: id + '-verso-clip', clipPathUnits: 'objectBoundingBox' });
    const unitPath = svgNode('path', { transform: 'translate(1 0) scale(-1 1)' });
    clip.append(unitPath); defs.append(texture, light, clip); svg.append(defs);
    const shape = svgNode('path', { id: id + '-shape' });
    defs.append(shape);
    const highlight = svgNode('use', { href: '#' + id + '-shape', class: 'page-highlight', fill: 'url(#' + id + '-light)' });
    svg.append(svgNode('use', { href: '#' + id + '-shape', class: 'page-shape', fill: 'url(#' + id + '-texture)' }), highlight);
    const back = svgNode('svg', { class: 'page-svg page-svg-back', viewBox: '0 0 1000 1400', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const reverse = svgNode('g', { transform: 'translate(1000 0) scale(-1 1)' });
    reverse.append(svgNode('use', { href: '#' + id + '-shape', fill: 'url(#' + id + '-texture)' }), svgNode('use', { href: '#' + id + '-shape', fill: 'url(#' + id + '-light)' }));
    back.append(reverse);
    const verso = document.createElement('span'); verso.className = 'page-verso';
    verso.style.clipPath = 'url(#' + id + '-verso-clip)';
    sheet.append(svg, back, verso);
    // A narrow curved paper edge keeps the final sheet visible edge-on.
    // It carries parchment only; card ownership stays on the verso.
    if (index === sheets.length - 1) {
      const curl = svgNode('svg', {class:'page-curl', viewBox:'0 0 24 1400', preserveAspectRatio:'none', 'aria-hidden':'true'});
      const curlPath = svgNode('path', {d:'M 0 0 C 18 180 24 420 14 700 C 5 980 20 1210 0 1400 C 8 1180 -3 970 4 700 C 13 410 5 180 0 0 Z', fill:'#c7a16b'});
      const curlLight = svgNode('linearGradient', {id:id+'-curl-light'});
      [[0,0],[.45,.35],[1,0]].forEach(([offset,opacity]) => curlLight.append(svgNode('stop', {offset,'stop-color':'#dbc399','stop-opacity':opacity})));
      const curlDefs = svgNode('defs'); curlDefs.append(curlLight);
      curlPath.setAttribute('fill', 'url(#'+id+'-curl-light)');
      curl.append(curlDefs,curlPath); sheet.append(curl);
    }
    return {
      sheet, shape, unitPath, light, stops, verso, depth,
      start: FIRST_SHEET_START + (sheetMotion[index][0] - FIRST_SHEET_START) * PAPER_TEMPO,
      time: sheetMotion[index][1] * PAPER_TEMPO,
      started: false, landed: false,
    };
  };
  const paper = sheets.map(createTurningPage);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const styles = getComputedStyle(body);
  const duration = (name) => parseFloat(styles.getPropertyValue(name)) || 0;
  const timers = new Set();
  let navigating = false;
  let sequence = 0;
  const later = (fn, ms) => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const clearTimers = () => { timers.forEach(window.clearTimeout); timers.clear(); };
  const setState = (state) => { body.dataset.bookState = state; };
  const resetTilt = (element, prefix = 'tilt') => {
    element.style.removeProperty(`--${prefix}-x`);
    element.style.removeProperty(`--${prefix}-y`);
  };
  const ready = () => {
    clearTimers();
    window.cancelAnimationFrame(paperFrame);
    archive.classList.remove('is-glimpsing');
    // The same landed verso keeps rendering the left page. No layer handoff.
    if (!physicalLandingComplete) archive.classList.remove('verso-owns-left');
    body.classList.add('intro-focused');
    setState('ready');
    // A completed physical book stays in place. Skip/reduced-motion routes
    // can omit the turning layer because no physical opening was performed.
    stage.hidden = !physicalLandingComplete;
    stage.inert = true;
    stage.setAttribute('aria-hidden', 'true');
    archive.inert = false;
    archive.removeAttribute('aria-hidden');
    trigger.setAttribute('aria-expanded', 'true');
    const heading = archive.querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  };
  const showFallback = () => {
    cover.hidden = true;
    document.querySelector('.cover-fallback').hidden = false;
  };
  cover.addEventListener('error', showFallback);
  if (cover.complete && !cover.naturalWidth) showFallback();

  stage.hidden = false;
  archive.inert = true;
  archive.setAttribute('aria-hidden', 'true');
  setState('closed');

  // The last verso owns the left print until contact is complete. Reuse the
  // exact spread layout (including typography and contain-fit artwork), not
  // separately measured card images that can drift during handoff.
  const prepareFinalVerso = (spreadRect, localWidth, localHeight) => {
    const material = document.createElement('span');
    material.className = 'final-verso-material';
    Object.assign(material.style, {width: localWidth + 'px', height: localHeight + 'px'});
    const print = archive.cloneNode(true);
    print.classList.add('verso-spread');
    // Binding belongs to the stationary book, never to a turning sheet.
    print.querySelector('.book-frame')?.remove();
    print.removeAttribute('id');
    print.setAttribute('aria-hidden', 'true');
    print.inert = true;
    print.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    const layout = getComputedStyle(archive);
    Object.assign(print.style, {
      width: spreadRect.width + 'px', height: spreadRect.height + 'px',
      minHeight: '0', padding: layout.padding, gap: layout.gap,
      transform: 'scale(' + localWidth / (spreadRect.width / 2) + ',' + localHeight / spreadRect.height + ')'
    });
    material.append(print);
    const finalSheet = paper[paper.length - 1];
    finalSheet.sheet.classList.add('final-turning-page');
    finalSheet.verso.replaceChildren(material);
    // Live semantic links stay in the stationary layout. Mirror their existing
    // interaction styling onto the retained print without changing its layout.
    const printedCards = [...print.querySelectorAll('.tale-card')];
    const syncPrint = () => {
      cards.forEach((card, i) => {
        printedCards[i].className = card.className;
        printedCards[i].style.cssText = card.style.cssText;
        printedCards[i].classList.toggle('printed-focus', card.matches(':focus-visible'));
      });
      print.classList.toggle('is-opening', archive.classList.contains('is-opening'));
    };
    const printObserver = new MutationObserver(syncPrint);
    cards.forEach(card => {
      printObserver.observe(card, {attributes:true,attributeFilter:['class','style']});
      card.addEventListener('focus', syncPrint);
      card.addEventListener('blur', syncPrint);
    });
    printObserver.observe(archive, {attributes:true,attributeFilter:['class']});
    archive.classList.add('verso-owns-left');
  };

  // Cubic silhouette deformation, with fixed spine endpoints. Corner lag
  // changes the actual outline; no strips, repeated panels, or per-strip light.
  const bendSheet = (entry, progress, width, index) => {
    const p = clamp(progress);
    const bend = Math.sin(p * Math.PI);
    const topPhase = clamp((p - .025) / .975);
    const bottomPhase = clamp((p - .04) / .96);
    const topLift = Math.sin(topPhase * Math.PI);
    const bottomLift = Math.sin(bottomPhase * Math.PI);
    const variation = .94 + index * .008;
    const outerX = 1000 - 100 * bend * variation;
    const topY = -24 * topLift * variation;
    const bottomY = 1400 + 22 * bottomLift * variation;
    const reversal = Math.cos(p * Math.PI);
    const points = [0, 0, 290, -4 * bend, 720, -34 * topLift, outerX, topY,
      outerX + 155 * bend, 400 - 35 * reversal * bend,
      outerX - 95 * bend * reversal, 1030 + 35 * bend, outerX + 20 * bend, bottomY,
      710, 1400 + 34 * bottomLift, 285, 1400 + 3 * bend, 0, 1400];
    const path = (normalized) => {
      const n = points.map((v, i) => (normalized ? v / (i % 2 ? 1400 : 1000) : v).toFixed(5));
      return 'M ' + n.slice(0, 2).join(' ') + ' C ' + n.slice(2, 8).join(' ') + ' C ' + n.slice(8, 14).join(' ') + ' C ' + n.slice(14, 20).join(' ') + ' Z';
    };
    entry.shape.setAttribute('d', path(false));
    entry.unitPath.setAttribute('d', path(true));
    const angle = 180 * smooth(p);
    const landedDepth = index === paper.length - 1 ? 0 : -.6 + index * .04;
    const sheetDepth = entry.depth * (1 - smooth(p)) + landedDepth * smooth(p);
    entry.sheet.style.setProperty('--curl-visibility', Math.pow(Math.sin(Math.PI * clamp((p - .38) / .24)), 2).toFixed(4));
    entry.sheet.style.transform = 'translateZ(' + (sheetDepth + 3 * bend).toFixed(3) + 'px) rotateY(' + (-angle).toFixed(4) + 'deg)';
    entry.light.setAttribute('x1', (-200 + 330 * p).toFixed(2));
    entry.light.setAttribute('x2', (800 + 330 * p).toFixed(2));
    const finalSheet = index === paper.length - 1;
    entry.stops[1].setAttribute('stop-opacity', (finalSheet ? .26 * bend : .03 + .23 * bend).toFixed(3));
    entry.stops[2].setAttribute('stop-opacity', (finalSheet ? .205 * bend : .015 + .19 * bend).toFixed(3));
  };
  paper.forEach((entry, index) => bendSheet(entry, 0, 0, index));

  const runPaper = (current) => {
    // Only one layout read, before the frame loop. All frame writes are
    // transforms, lighting, and stack-edge heights; no per-frame layout reads.
    const width = sheets[0].offsetWidth;
    const startedAt = performance.now();
    const last = paper[paper.length - 1];
    const turnEnd = last.start + last.time;
    const finalTime = turnEnd + duration('--settle-time');
    const frame = (now) => {
      if (current !== sequence) return;
      const elapsed = now - startedAt;
      let transferred = 0;
      let landingPressure = 0;
      let strongestShadow = 0;
      let shadowPosition = 50;
      paper.forEach((entry, index) => {
        const progress = clamp((elapsed - entry.start) / entry.time);
        transferred += smooth(progress);
        // Single contact pulse, with no oscillation; outer edge only.
        const contact = clamp((progress - .76) / .24);
        const release = clamp((elapsed - entry.start - entry.time) / 200);
        landingPressure = Math.max(landingPressure, smooth(contact) * (1 - smooth(release)));
        if (elapsed < entry.start) return;
        if (!entry.started) {
          entry.started = true;
          entry.sheet.classList.add('is-turning');
          if (index === paper.length - 1) {
            stage.classList.add('is-uncovering');
            archive.classList.add('is-glimpsing');
          }
        }
        if (!entry.landed) bendSheet(entry, progress, width, index);
        if (progress === 1 && !entry.landed) {
          entry.landed = true;
          entry.sheet.classList.add('is-landed');
        }
        const shadow = Math.sin(Math.PI * progress);
        if (shadow > strongestShadow) {
          strongestShadow = shadow;
          shadowPosition = 50 + Math.cos(Math.PI * progress) * 32;
        }
      });
      const transfer = transferred / paper.length;
      physicalBook.style.setProperty('--right-edge-width', `${(16 - 10 * transfer).toFixed(2)}px`);
      physicalBook.style.setProperty('--left-edge-width', `${(6 + 10 * transfer).toFixed(2)}px`);
      physicalBook.style.setProperty('--left-edge-lift', `${(-1.5 * transfer).toFixed(2)}px`);
      physicalBook.style.setProperty('--landing-pressure', landingPressure.toFixed(4));
      physicalBook.style.setProperty('--landing-px', (1.5 * landingPressure).toFixed(3) + 'px');
      physicalBook.style.setProperty('--left-stack-opacity', Math.min(1, transfer * 8).toFixed(3));
      physicalBook.style.setProperty('--contact-alpha', (strongestShadow * .28 + landingPressure * .045).toFixed(3));
      physicalBook.style.setProperty('--contact-x', `${shadowPosition.toFixed(2)}%`);
      physicalBook.style.setProperty('--contact-width', `${(34 - strongestShadow * 22).toFixed(2)}%`);
      const finalProgress = clamp((elapsed - last.start) / last.time);
      physicalBook.style.setProperty('--left-uncovered', `${(smooth(finalProgress) * 100).toFixed(2)}%`);
      if (elapsed >= turnEnd) {
        // Paper-only relaxation. The common book transform never changes.
        const settle = smooth(clamp((elapsed - turnEnd) / duration('--settle-time')));
        // bendSheet already converged to the final flat transform; retain it.
        physicalBook.style.setProperty('--contact-alpha', (.045 * (1 - settle)).toFixed(3));
        // Printed content and parchment already have their final appearance.
        // A small, one-way compression as the final sheet lands. Keep the
        // compressed outer stack visible afterward, without a rebound.
        physicalBook.style.setProperty('--left-edge-width', `${(16 - 1.5 * settle).toFixed(2)}px`);
        physicalBook.style.setProperty('--left-edge-lift', `${(-1.5 + .75 * settle).toFixed(2)}px`);
      }
      if (elapsed < finalTime) {
        paperFrame = window.requestAnimationFrame(frame);
      } else {
        physicalLandingComplete = true;
        ready();
      }
    };
    paperFrame = window.requestAnimationFrame(frame);
  };

  const openBook = () => {
    if (body.dataset.bookState !== 'closed') return;
    trigger.disabled = true;
    trigger.setAttribute('aria-expanded', 'true');
    resetTilt(trigger, 'cover');
    if (reducedMotion.matches) { ready(); return; }
    // Normalize the idle pose synchronously so opening starts on this click,
    // without an approach timer or a pause before the cover moves.
    const floatingCover = document.querySelector('.cover-float');
    floatingCover.style.transform = getComputedStyle(floatingCover).transform;
    floatingCover.style.animation = 'none';
    void floatingCover.offsetWidth;
    floatingCover.style.transform = 'translateY(0)';
    const current = ++sequence;
    setState('approach');
    {
      if (current !== sequence) return;
      const from = physicalBook.getBoundingClientRect();
      const to = archive.getBoundingClientRect();
      const spine = to.left + to.width / 2;
      const bookLayout = getComputedStyle(physicalBook);
      prepareFinalVerso(to, parseFloat(bookLayout.width), parseFloat(bookLayout.height));
      physicalBook.style.setProperty('--spread-x', `${spine - from.left}px`);
      physicalBook.style.setProperty('--spread-y', `${to.top - from.top}px`);
      physicalBook.style.setProperty('--spread-scale-x', to.width / 2 / from.width);
      physicalBook.style.setProperty('--spread-scale-y', to.height / from.height);
      physicalBook.style.setProperty('--edge-width-unit', from.width * 2 / to.width);
      physicalBook.style.setProperty('--edge-height-unit', from.height / to.height);
      // The interior begins exactly beneath the closed cover, with its left
      // half clipped. It grows with the physical book rather than popping in.
      archive.style.setProperty('--interior-x', `${from.left - spine}px`);
      archive.style.setProperty('--interior-y', `${from.top - to.top}px`);
      archive.style.setProperty('--interior-scale-x', from.width * 2 / to.width);
      archive.style.setProperty('--interior-scale-y', from.height / to.height);
      void archive.offsetWidth;
      setState('unfold');
      runPaper(current);
    }
  };
  // Size only the intro's outer wrapper; the animation book retains its
  // existing dimensions. Recalculate before entry for responsive viewports.
  const sizeIntroBook = () => {
    if (body.dataset.bookState !== 'closed' || body.classList.contains('intro-focused')) return;
    const width = parseFloat(getComputedStyle(cover).width);
    const height = parseFloat(getComputedStyle(cover).height);
    if (!width || !height) return;
    const compact = window.innerWidth <= 700;
    const desired = compact ? window.innerWidth * .72 : Math.min(650, Math.max(500, window.innerWidth * .427));
    const scale = Math.min(1.1 * Math.min(desired / width, window.innerHeight * (compact ? .48 : .76) / height), window.innerHeight * (compact ? .55 : .88) / height, window.innerWidth * (compact ? .74 : .78) / width);
    stage.style.setProperty('--intro-book-scale', scale);
  };
  cover.addEventListener('load', sizeIntroBook);
  window.addEventListener('resize', sizeIntroBook);
  sizeIntroBook();

  // Intro positioning is an outer transform only. The existing physical book
  // and its renderer keep their original geometry and timeline.
  let introStarted = false;
  let introTravel;
  const enterArchive = () => {
    if (introStarted || body.dataset.bookState !== 'closed') return;
    document.querySelector('#book-scene')?.scrollIntoView({behavior: 'instant'});
    introStarted = true;
    body.classList.add('intro-focused');
    document.querySelector('.intro-ui').inert = true;
    if (reducedMotion.matches) {
      stage.style.transform = 'none';
      openBook();
      return;
    }
    const initial = getComputedStyle(stage).transform;
    stage.style.transform = 'none';
    introTravel = stage.animate([{transform:initial},{transform:'none'}], {
      duration:750,easing:'cubic-bezier(.22,.75,.25,1)',fill:'forwards'
    });
    later(() => {
      if (body.dataset.bookState !== 'closed') return;
      const remaining = getComputedStyle(stage).transform;
      introTravel.cancel();
      // Measure in the original centered coordinate system synchronously.
      // Restore the remaining outer travel before the next painted frame.
      openBook();
      introTravel = stage.animate([{transform:remaining},{transform:'none'}], {
        duration:250,easing:'cubic-bezier(.22,.75,.25,1)',fill:'forwards'
      });
    },500);
  };
  trigger.addEventListener('click', enterArchive);
  document.querySelectorAll('[data-open-archive]').forEach(button => button.addEventListener('click', enterArchive));
  const aboutDialog = document.querySelector('.intro-about');
  document.querySelector('[data-about]').addEventListener('click', () => aboutDialog.showModal());
  document.querySelector('.skip-link').addEventListener('click', (event) => {
    if (body.dataset.bookState === 'ready') return;
    event.preventDefault();
    sequence++;
    ready();
  });

  const attachTilt = (element, prefix, enabled) => {
    let bounds;
    element.addEventListener('pointerenter', () => { bounds = element.getBoundingClientRect(); });
    element.addEventListener('pointermove', (event) => {
      if (!enabled() || reducedMotion.matches || !finePointer.matches || !bounds) return;
      if (prefix === 'tilt') element.classList.add('has-pointer-intent');
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      element.style.setProperty(`--${prefix}-x`, `${(-y * 2.5).toFixed(2)}deg`);
      element.style.setProperty(`--${prefix}-y`, `${(x * 2.5).toFixed(2)}deg`);
    });
    ['pointerleave', 'pointercancel'].forEach((event) => element.addEventListener(event, () => {
      resetTilt(element, prefix);
      element.classList.remove('has-pointer-intent');
    }));
  };
  attachTilt(trigger, 'cover', () => body.dataset.bookState === 'closed' && !body.classList.contains('has-intro'));
  cards.forEach((card) => {
    attachTilt(card, 'tilt', () => body.dataset.bookState === 'ready' && !navigating);
    if (!card.matches('a[href]')) return;
    card.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (body.dataset.bookState !== 'ready' || navigating) { event.preventDefault(); return; }
      if (card.classList.contains('tale-red') && window.enterFairytaleArchive) {
        event.preventDefault();
        navigating = true;
        window.enterFairytaleArchive(archive, card.href);
        return;
      }
      if (reducedMotion.matches) return;
      event.preventDefault();
      navigating = true;
      cards.forEach((item) => resetTilt(item));
      card.classList.add('is-selected');
      archive.classList.add('is-opening');
      later(() => window.location.assign(card.href), duration('--navigate-time'));
    });
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && !['closed', 'ready'].includes(body.dataset.bookState)) {
      sequence++;
      ready();
    }
  });
  // Explicit return link uses the existing completed-book state, then consumes the marker.
  const returnURL = new URL(location.href);
  if (returnURL.searchParams.get('return') === 'book') {
    ready();
    document.querySelector('.intro-ui').inert = true;
    returnURL.searchParams.delete('return');
    history.replaceState(history.state, '', returnURL.pathname + returnURL.search + returnURL.hash);
    requestAnimationFrame(() => document.querySelector('#book-scene').scrollIntoView({behavior:'instant'}));
  }
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    sequence++;
    navigating = false;
    archive.classList.remove('is-opening');
    cards.forEach((card) => { card.classList.remove('is-selected'); resetTilt(card); });
    ready();
  });
}

