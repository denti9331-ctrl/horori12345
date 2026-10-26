// Consume the one-shot token before first paint. Reloads/direct visits never replay.
(() => {
 const key='fairytale-fog-arrival';let token;
 try{token=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);}catch{return;}
 const type=performance.getEntriesByType('navigation')[0]?.type;
 if(!token||token.url!==location.href||Date.now()-token.time>15000||type==='reload'||type==='back_forward'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const root=document.documentElement;
 const clear=()=>root.classList.remove('tale-fog-arrival');
 root.classList.add('tale-fog-arrival');
 // Independent of image loads; no click-blocking node survives this timer.
 setTimeout(clear,950);
 addEventListener('pageshow',event=>{if(event.persisted)clear();});
 addEventListener('pagehide',clear);
})();
