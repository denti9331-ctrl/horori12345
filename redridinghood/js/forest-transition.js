// No wheel interception or stateful progress: reversing scroll reverses the scene.
(() => {
 const section=document.querySelector('.forest-transition');if(!section)return;
 const stage=section.querySelector('.forest-transition__stage'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=n=>Math.min(1,Math.max(0,n));const ease=n=>{const t=clamp(n);return t*t*(3-2*t);};
 let frame=0;
 function paint(){frame=0;
  const distance=Math.max(1,section.offsetHeight-stage.offsetHeight);
  const p=motion.matches?1:clamp(-section.getBoundingClientRect().top/distance);
  const open=ease((p-.3)/.4),reveal=ease((p-.7)/.24),mobile=innerWidth<=650;
  const vars={'--tree-left':(-32*open)+'%','--tree-right':(32*open)+'%','--background-y':(motion.matches?0:(1-p)*(mobile?6:12))+'px','--dark':String(.94*(1-ease(p/.7))),'--mist':String(.32*(1-open)),'--copy-opacity':String(reveal),'--copy-y':(motion.matches?0:18*(1-reveal))+'px'};
  Object.entries(vars).forEach(([key,value])=>section.style.setProperty(key,value));
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 section.classList.add('is-enhanced');paint();
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});window.addEventListener('pageshow',schedule);motion.addEventListener('change',schedule);
 // Both supplied foreground PNGs have verified alpha; no canvas readback is needed.
})();
