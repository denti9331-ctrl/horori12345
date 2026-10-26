(() => {
 const nav=document.querySelector('.main-navigation');if(!nav)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 nav.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const target=document.getElementById(link.hash.slice(1));if(!target)return;
  event.preventDefault();
  const top=link.hash==='#main-intro'?0:scrollY+target.getBoundingClientRect().top-nav.offsetHeight;
  window.scrollTo({top:Math.max(0,top),behavior:reduced.matches?'instant':'smooth'});
 }));
 // ABOUT retains the existing script.js dialog handler and its native focus restoration.
})();
