(() => {
 const nav=document.querySelector('.story-topnav');if(!nav)return;
 const button=nav.querySelector('button'),list=nav.querySelector('ul');
 const links=[...list.querySelectorAll('a')],targets=links.map(a=>document.getElementById(a.hash.slice(1)));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const close=(focus=false)=>{list.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();};
 button.addEventListener('click',()=>{const open=list.hidden;list.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)links[0].focus();});
 nav.addEventListener('keydown',e=>{if(e.key==='Escape'&&!list.hidden){e.preventDefault();close(true);}});
 document.addEventListener('pointerdown',e=>{if(!nav.contains(e.target)&&!list.hidden)close(list.contains(document.activeElement));});
 nav.addEventListener('focusout',()=>setTimeout(()=>{if(!nav.contains(document.activeElement))close();},0));
 const position=target=>{
  if(target.id==='intro-title')return 0;
  if(target.id==='story-title'){
   const section=target.closest('.forest-transition'),stage=section.querySelector('.forest-transition__stage');
   return scrollY+section.getBoundingClientRect().top+Math.max(0,section.offsetHeight-stage.offsetHeight);
  }
  return scrollY+target.getBoundingClientRect().top-nav.offsetHeight-24;
 };
 links.forEach((a,i)=>a.addEventListener('click',e=>{
  if(e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
  e.preventDefault();close();const target=targets[i];if(!target)return;
  target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
  scrollTo({top:Math.max(0,position(target)),behavior:reduce.matches?'instant':'smooth'});
 }));
 let frame=0;
 const update=()=>{frame=0;let active=0;targets.forEach((target,i)=>{if(target&&position(target)<=scrollY+80)active=i;});links.forEach((a,i)=>{if(i===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});update();
})();
