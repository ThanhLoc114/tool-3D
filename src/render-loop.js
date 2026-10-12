// Orbit damping schedules its next frame through the change event.
// An idle/hidden tool does not keep an animation loop running.
export function renderWhenNeeded(renderer,scene,camera,controls){
 let frame=null,dirty=true;
 const draw=()=>{frame=null;if(document.hidden)return;controls.update();if(dirty){dirty=false;renderer.render(scene,camera)}};
 const invalidate=()=>{dirty=true;if(!document.hidden&&frame===null)frame=requestAnimationFrame(draw)};
 controls.addEventListener('change',invalidate);
 for(const event of ['input','click','keycraft:model'])document.addEventListener(event,invalidate);
 window.addEventListener('resize',invalidate);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame!==null)cancelAnimationFrame(frame);frame=null}else invalidate()});
 renderer.domElement?.addEventListener('webglcontextrestored',invalidate);
 window.addEventListener('pageshow',invalidate);
 invalidate();return invalidate;
}
