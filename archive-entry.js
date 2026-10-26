// Departure is timer-bounded and does not wait for assets or animation promises.
(() => {
 const key='fairytale-fog-arrival';
 let active=false,timer=0,layer=null;
 const reset=()=>{clearTimeout(timer);active=false;layer?.remove();layer=null;document.body.classList.remove('tale-departing');};
 window.enterFairytaleArchive=(book,url)=>{
  if(active)return;active=true;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go=()=>{
   try{if(!reduce)sessionStorage.setItem(key,JSON.stringify({url:new URL(url,location.href).href,time:Date.now()}));else sessionStorage.removeItem(key);}catch{}
   location.assign(url);
  };
  if(reduce){go();return;}
  timer=setTimeout(go,2400);
  try{
   document.body.classList.add('tale-departing');
   layer=document.createElement('div');layer.className='tale-departure';layer.setAttribute('role','status');
   const quote=document.createElement('p');quote.lang='en';quote.textContent='Not every tale ends\nthe way you remember';
   layer.append(quote);document.body.append(layer);
  }catch{clearTimeout(timer);go();}
 };
 window.addEventListener('pagehide',reset);
 window.addEventListener('pageshow',()=>{reset();try{sessionStorage.removeItem(key);}catch{}});
})();
