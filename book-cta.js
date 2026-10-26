// Reveal the CTA once when its own box enters view, independent of book transforms.
(() => {
 const button=document.querySelector('.intro-cta'), content=button?.querySelector('.intro-cta__reveal');
 if(!content||!('IntersectionObserver' in window))return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 if(motion.matches)return;
 let done=false,observer;
 const reveal=(immediate=false)=>{
  if(done)return;done=true;observer?.disconnect();content.classList.remove('cta-pending');
  if(immediate||motion.matches||!content.animate)return;
  content.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:900,easing:'cubic-bezier(.22,1,.36,1)'});
  content.querySelectorAll('.intro-rule').forEach(line=>line.animate([{opacity:0},{opacity:1}],{duration:650,delay:180,fill:'backwards',easing:'ease-out'}));
 };
 try{
  observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.2))reveal();},{threshold:.2});
  observer.observe(button);content.classList.add('cta-pending');
 }catch{reveal(true);}
 button.addEventListener('focus',()=>reveal(true));
 button.addEventListener('click',()=>reveal(true));
 motion.addEventListener('change',()=>{if(motion.matches){reveal(true);content.getAnimations({subtree:true}).forEach(a=>a.finish());}});
})();
