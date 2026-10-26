// One-time scroll reveals and cancellable edition transitions.
(() => {
  const section=document.querySelector('.truth-section');
  if(!section)return;
  const buttons=[...section.querySelectorAll('[data-year]')];
  const images=[...section.querySelectorAll('[data-ending-image]')];
  const ending=section.querySelector('.truth-ending');
  const versions={
    '1697':{title:'구출되지 못한 소녀',lines:[
      '페로의 이야기에서는 사냥꾼이 등장하지 않는다.',
      '늑대가 빨간모자를 잡아먹고 이야기는 끝난다.',
      '이야기는 소녀에게 경고를 남기는 교훈으로 전해졌다.']},
    '1812':{title:'사냥꾼이 바꾼 결말',lines:[
      '그림 형제의 이야기에서는 사냥꾼이 등장한다.',
      '사냥꾼은 늑대의 배를 열어 빨간모자와 할머니를 구출한다.',
      '이렇게 이야기는 우리가 익숙하게 기억하는 결말에 가까워졌다.']}
  };

  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let selected='1697', request=0, textAnimation=null;
  const render=(node,year)=>{
    node.querySelector('h3').textContent=versions[year].title;
    node.querySelector('.truth-description').replaceChildren(...versions[year].lines.map(line=>{
      const p=document.createElement('p');p.textContent=line;return p;
    }));
  };
  // Measure both editions invisibly, reserving the larger text footprint.
  function reserveText(){
    const clone=ending.cloneNode(true);
    clone.removeAttribute('id');clone.removeAttribute('aria-live');clone.setAttribute('aria-hidden','true');
    Object.assign(clone.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',width:ending.getBoundingClientRect().width+'px',minHeight:'0',transform:'none'});
    ending.parentElement.append(clone);
    let height=0;
    for(const year of Object.keys(versions)){render(clone,year);height=Math.max(height,clone.getBoundingClientRect().height);}
    clone.remove();ending.style.minHeight=Math.ceil(height)+'px';
  }
  // Wait for a decoded video frame before uncovering the incoming edition.
  const readyVideos=new WeakMap();
  function readyVideo(video){
    if(video.readyState>=2)return Promise.resolve();
    if(readyVideos.has(video))return readyVideos.get(video);
    const promise=new Promise((resolve,reject)=>{
      const clean=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',done);video.removeEventListener('error',fail);readyVideos.delete(video);};
      const done=()=>{clean();resolve();};
      const fail=()=>{clean();reject(new Error('Edition video unavailable'));};
      const timer=setTimeout(fail,15000);
      video.addEventListener('loadeddata',done,{once:true});video.addEventListener('error',fail,{once:true});
      if(video.error){fail();return;}if(video.networkState===0)video.load();
    });
    readyVideos.set(video,promise);return promise;
  }
  async function select(year){
    if(!versions[year]||year===selected)return;
    selected=year;const ticket=++request;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.year===year)));
    textAnimation?.cancel();
    const incoming=images.find(image=>image.dataset.endingImage===year);
    try{
      if(incoming.tagName==='VIDEO'){
        incoming.muted=true;
        await readyVideo(incoming);
        await incoming.play().catch(()=>{});
      }else if(incoming.decode)await incoming.decode();
    }catch{
      if(ticket===request){
        selected=images.find(media=>media.classList.contains('truth-edition-active'))?.dataset.endingImage||'1697';
        buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.year===selected)));
      }
      return;
    }
    if(ticket!==request)return;
    // Both images stay in the existing identical absolute-positioned slots.
    images.forEach(image=>{
      image.classList.toggle('truth-edition-active',image.dataset.endingImage===year);
      image.setAttribute('aria-hidden',String(image.dataset.endingImage!==year));
    });
    if(motion.matches||!ending.animate){render(ending,year);return;}
    textAnimation=ending.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out',fill:'forwards'});
    try{await textAnimation.finished;}catch{return;}
    if(ticket!==request)return;
    render(ending,year);textAnimation.cancel();
    textAnimation=ending.animate([{opacity:0},{opacity:1}],{duration:300,easing:'ease-out'});
  }
  // Set opacity before removing hidden to prevent a first-frame flash.
  images.forEach(image=>{image.classList.add('truth-edition-image');image.classList.toggle('truth-edition-active',!image.hidden);image.setAttribute('aria-hidden',String(image.hidden));image.hidden=false;});
  buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.year)));
  reserveText();
  document.fonts?.ready.then(reserveText);
  let resizeFrame=0;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(reserveText);},{passive:true});

  // Rows use display:contents: observe real copy/art boxes instead of rows.
  const groups=[];
  function group(target,items,art=false,delay=0,duration=850,distance=14,scale=1){
    if(target)groups.push({target,items,art,delay,duration,distance,scale});
  }
  const origin=section.querySelector('.truth-origin > .truth-copy');
  const publication=section.querySelector('.truth-publication > .truth-copy');
  const comparison=section.querySelector('.truth-ending-copy');
  group(origin,[...origin.children]);
  group(section.querySelector('.truth-origin-art'),[section.querySelector('.truth-origin-art')],true,180,1100,20,.98);
  group(section.querySelector('.truth-publication > .truth-art'),[section.querySelector('.truth-publication > .truth-art')],true,0,1000,24,.97);
  group(publication,[...publication.children]);
  group(comparison,[...section.querySelector('.truth-comparison-heading').children,...ending.children]);
  group(section.querySelector('.truth-ending-art'),[section.querySelector('.truth-ending-art')],true,120,900,18,.98);
  let observer;
  function show(g,immediate=false){
    if(g.done)return;g.done=true;observer?.unobserve(g.target);
    g.items.forEach((item,index)=>{
      item.classList.remove('truth-reveal-pending');
      if(!immediate&&!motion.matches&&item.animate){
        item.animate([{opacity:0,transform:'translateY('+g.distance+'px) scale('+g.scale+')'},{opacity:1,transform:'none'}],{
          duration:g.art?g.duration:480,delay:g.delay+(g.art?0:Math.min(index,4)*120),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'
        });
      }
    });
  }
  if('IntersectionObserver' in window&&!motion.matches){
    try{
      observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        const g=groups.find(group=>group.target===entry.target);
        if(entry.intersectionRatio>=.2||entry.boundingClientRect.bottom<0)show(g);
      }),{threshold:.2});
      groups.forEach(g=>{g.items.forEach(item=>item.classList.add('truth-reveal-pending'));observer.observe(g.target);});
    }catch{groups.forEach(g=>show(g,true));}
  }
  // A large wheel/touch jump can cross a whole box between observer samples.
  let scrollFrame=0;
  window.addEventListener('scroll',()=>{
    if(scrollFrame)return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;groups.forEach(g=>{if(!g.done&&g.target.getBoundingClientRect().bottom<0)show(g,true);});});
  },{passive:true});
  section.addEventListener('focusin',()=>groups.forEach(g=>show(g,true)));
  motion.addEventListener('change',()=>{if(motion.matches){groups.forEach(g=>show(g,true));section.getAnimations({subtree:true}).forEach(a=>a.finish());}});
})();
