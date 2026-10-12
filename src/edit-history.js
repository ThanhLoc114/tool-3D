// Shared controls: reset a parameter and revisit recent form edits.
export function mountEditHistory(){
 if(document.getElementById('edit-history'))return;
 const bar=document.createElement('div');bar.id='edit-history';bar.className='edit-history';bar.innerHTML='<button type="button" id="history-undo" disabled>↶ Hoàn tác</button><button type="button" id="history-redo" disabled>↷ Làm lại</button><span>Quay lại các thông số đã chỉnh</span>';
 const nav=document.querySelector('.tool-nav');nav?.after(bar);
 const undo=bar.querySelector('#history-undo'),redo=bar.querySelector('#history-redo');
 const fields=()=>[...document.querySelectorAll('main input[id],main select[id],main textarea[id]')].filter(e=>!['file','button','submit','hidden'].includes(e.type));
 const snapshot=()=>Object.fromEntries(fields().map(e=>[e.id,e.type==='checkbox'?e.checked:e.value]));
 let entries=[snapshot()],cursor=0,restoring=false,timer;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function sync(){undo.disabled=cursor===0;redo.disabled=cursor===entries.length-1}
 function commit(){clearTimeout(timer);if(restoring)return;const now=snapshot();if(same(now,entries[cursor]))return;entries=entries.slice(0,cursor+1);entries.push(now);if(entries.length>80)entries.shift();cursor=entries.length-1;sync()}
 async function restore(target){restoring=true;try{const state=entries[target];for(const e of fields()){if(!(e.id in state)||e.disabled)continue;const value=state[e.id],before=e.type==='checkbox'?e.checked:e.value;if(before===value)continue;if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}cursor=target;sync()}finally{restoring=false}}
 undo.onclick=()=>{commit();if(cursor>0)restore(cursor-1)};redo.onclick=()=>{clearTimeout(timer);if(cursor<entries.length-1)restore(cursor+1)};
 function edit(e){if(restoring||!e.target.matches('main input[id]:not([type=file]),main select[id],main textarea[id]'))return;clearTimeout(timer);timer=setTimeout(commit,e.type==='change'?0:450)}
 document.addEventListener('input',edit);document.addEventListener('change',edit);
 document.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey)return;if(e.target.matches('input,textarea,[contenteditable=true]'))return;if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?redo:undo).click()}else if(e.key.toLowerCase()==='y'){e.preventDefault();redo.click()}});
 function decorate(){for(const slider of document.querySelectorAll('main input[type=range]')){if(slider.dataset.resetMounted)continue;slider.dataset.resetMounted='1';const parent=slider.closest('.parameter-control')||slider.parentElement;const number=parent.querySelector('input[type=number]');const original=number?.getAttribute('value')??slider.getAttribute('value')??slider.value;const button=document.createElement('button');button.type='button';button.className='parameter-reset';button.textContent='↺';button.title='Đặt lại mặc định: '+original;button.setAttribute('aria-label','Đặt lại '+(slider.getAttribute('aria-label')||slider.id)+' về '+original);button.onclick=()=>{if(slider.disabled||number?.disabled)return;commit();const e=number||slider;e.value=original;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));slider.value=original;commit()};parent.append(button)}}
 decorate();new MutationObserver(decorate).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});sync();
}
