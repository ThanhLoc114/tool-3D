// Warm only a destination the user is about to open; keep native links/history.
const warmed=new Set();
export function mountNavigation(){
 const nav=document.querySelector('.tool-nav');if(!nav)return;
 const warm=event=>{const link=event.target.closest('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname||warmed.has(url.href)||navigator.connection?.saveData)return;warmed.add(url.href);const hint=document.createElement('link');hint.rel='prefetch';hint.href=url.href;hint.as='document';document.head.append(hint)};
 nav.addEventListener('pointerover',warm,{passive:true});nav.addEventListener('focusin',warm);
 nav.addEventListener('click',event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const link=event.target.closest('a[href]');if(!link||new URL(link.href).pathname!==location.pathname)return;event.preventDefault()});
}
