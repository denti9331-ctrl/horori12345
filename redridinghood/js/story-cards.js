(() => {
  const root = document.querySelector('.story-gallery');
  if (!root) return;
  const cards = [...root.querySelectorAll('[data-story]')];
  const reader = document.createElement('dialog');
  reader.className = 'story-reader';
  reader.id = 'story-reader';
  reader.setAttribute('aria-labelledby', 'story-reader-title');
  reader.innerHTML = `<img class="story-reader__image" alt=""><button class="story-reader__close" type="button" aria-label="이야기 닫기">닫기 ×</button><div class="story-reader__body"><span class="story-reader__chapter"></span><h3 id="story-reader-title"></h3><p></p><nav aria-label="챕터 이동"><button type="button" data-prev>← 이전</button><button type="button" data-next>다음 →</button></nav></div>`;
  document.body.append(reader);
  const image = reader.querySelector('img'), body = reader.querySelector('.story-reader__body');
  const closeButton = reader.querySelector('.story-reader__close');
  const prev = reader.querySelector('[data-prev]'), next = reader.querySelector('[data-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = -1, busy = false, animation, imageAnimation;
  const geometry = rect => ({left:rect.left+'px', top:rect.top+'px', width:rect.width+'px', height:rect.height+'px'});
  function destination() {
    const vw = document.documentElement.clientWidth, vh = window.visualViewport?.height || innerHeight;
    const mobile = vw <= 650;
    const width = vw * (mobile ? .92 : .87);
    const height = Math.min(vh * (mobile ? .85 : .8), 850);
    return geometry({left:vw * (mobile ? .04 : .065),top:(vh-height)/2,width,height});
  }
  function content(index) {
    selected = index;
    const card = cards[index];
    image.style.visibility = '';
    image.src = card.querySelector('img').getAttribute('src');
    image.alt = card.querySelector('.story-card__title').textContent;
    reader.querySelector('.story-reader__chapter').textContent = card.querySelector('.story-card__chapter-label').textContent;
    reader.querySelector('h3').textContent = card.querySelector('.story-card__name').textContent;
    reader.querySelector('p').textContent = card.querySelector('.story-card__text').textContent;
    prev.disabled = index === 0; next.disabled = index === cards.length-1;
    cards.forEach((item,i) => item.setAttribute('aria-expanded',String(i === index)));
  }
  image.addEventListener('error', () => { image.style.visibility='hidden'; });
  async function travel(from, to, opening) {
    // Opening: 600ms portrait travel + 900ms unfolding. Closing stays deliberate but shorter.
    const duration = reduced.matches ? 0 : (opening ? 1500 : 1100);
    const mobile = document.documentElement.clientWidth <= 650;
    Object.assign(reader.style, to);
    // Move the unchanged portrait to the left first, then unfold to the right.
    // Closing follows the same path in reverse.
    const small = opening ? from : to;
    const large = opening ? to : from;
    const dock = {...small, left:large.left,
      top:(parseFloat(large.top)+(parseFloat(large.height)-parseFloat(small.height))/2)+'px'};
    const ease = 'cubic-bezier(.45,0,.3,1)';
    const frames = opening
      ? [{...from,offset:0,easing:ease},{...dock,offset:.4,easing:ease},{...to,offset:1}]
      : [{...from,offset:0,easing:ease},{...dock,offset:.6,easing:ease},{...to,offset:1}];
    animation = reader.animate(frames, {duration,easing:'linear'});
    const full={width:'100%',height:'100%'}, split={width:mobile?'100%':'48%',height:mobile?'42%':'100%'};
    const imageFrames = opening
      ? [{...full,offset:0},{...full,offset:.4,easing:ease},{...split,offset:1}]
      : [{...split,offset:0,easing:ease},{...full,offset:.6},{...full,offset:1}];
    imageAnimation = image.animate(imageFrames,{duration,easing:'linear'});
    await Promise.all([animation.finished.catch(()=>{}),imageAnimation.finished.catch(()=>{})]);
  }
  async function open(index) {
    if (busy) return;
    if (reader.open) {content(index);return;}
    busy=true;content(index);
    const from=geometry(cards[index].getBoundingClientRect());
    Object.assign(reader.style,from);
    reader.classList.remove('is-closing');
    reader.showModal();
    closeButton.focus({preventScroll:true});
    await travel(from,destination(),true);
    reader.classList.add('is-readable');busy=false;
  }
  async function close() {
    if (!reader.open || busy) return;
    busy=true;reader.classList.remove('is-readable');
    reader.classList.add('is-closing');
    // Measure again: returning geometry remains correct after resize or page scroll.
    await travel(geometry(reader.getBoundingClientRect()),geometry(cards[selected].getBoundingClientRect()),false);
    reader.close();cards.forEach(card=>card.setAttribute('aria-expanded','false'));
    cards[selected].focus({preventScroll:true});busy=false;
  }
  cards.forEach((card,index)=>{
    card.setAttribute('aria-controls',reader.id);card.setAttribute('aria-haspopup','dialog');
    card.addEventListener('click',()=>open(index));
  });
  closeButton.addEventListener('click',close);
  reader.addEventListener('cancel',event=>{event.preventDefault();close();});
  prev.addEventListener('click',()=>{if(!busy && selected>0)content(selected-1);});
  next.addEventListener('click',()=>{if(!busy && selected<cards.length-1)content(selected+1);});
  window.addEventListener('resize',()=>{
    if(reader.open){Object.assign(reader.style,destination());animation?.cancel();imageAnimation?.cancel();}
  });
})();



