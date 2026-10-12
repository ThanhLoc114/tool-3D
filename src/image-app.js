import { mountStudio } from './studio-ui.js';
import { requestModel } from './model-client.js';
import { renderWhenNeeded } from './render-loop.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { frameScheduler } from './parameter-controls.js';
import { export3MF, exportSTLs } from './model-export.js';
import './style.css';
import './image-style.css';

const isClicker=location.pathname.endsWith('/clicker.html');
const parameter=(id,label,min,max,step,value)=>`<label for="${id}-number">${label}</label><div class="parameter-control" data-param="${id}"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label} · thanh trượt"><input id="${id}-number" type="number" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label} · nhập số"></div>`;
document.querySelector('#app').innerHTML=`
<header><div class="brand"><b>◇</b><span>keycraft<span>XƯỞNG MÓC KHÓA 3D</span></span></div><small>● Xử lý ảnh trên máy của bạn</small></header>
<nav class="tool-nav"><a href="/">Móc khóa chữ</a><a class="active" href="/image.html">✦ Móc khóa từ ảnh</a><a href="/clicker.html">▣ Clicker từ ảnh</a><a href="/qr.html">▦ QR từ ảnh</a><a href="/baby.html">♡ Kỷ niệm bé</a></nav>
<div class="intro"><div><h1>Một tấm ảnh. Một chiếc móc khóa.</h1><p>Tải logo hoặc ảnh mẫu · Tự tách nền và màu · Tạo phù điêu 3D để in.</p></div><span class="badge">IMAGE → 3D</span></div>
<main class="image-workspace">
<section class="panel image-design"><h2><span class="number">01</span> Thêm hình của bạn</h2>
<label class="drop image-drop"><strong>↥ Tải ảnh để tự tạo 3D</strong><span>PNG, JPG, WEBP · tối đa 15 MB</span><input id="image-upload" type="file" accept="image/png,image/jpeg,image/webp"></label>
<label for="example-design">Ảnh mẫu để bắt đầu</label><select id="example-design"><option value="coffee.png">Cà phê</option><option value="star.svg">Ngôi sao vui vẻ</option><option value="flower.svg">Hoa năm cánh</option><option value="panda.svg">Gấu trúc</option><option value="robot.svg">Robot</option></select><button id="example" class="smallbutton">Dùng ảnh mẫu đã chọn</button>
<div id="image-review" class="hidden"><div class="review-tabs"><button class="active" data-review="original">Ảnh gốc</button><button data-review="mask">Mảng màu đã tách</button></div><img id="image-original" alt="Ảnh logo đã tải"><canvas id="image-mask" class="hidden" aria-label="Các mảng màu được tách từ ảnh"></canvas><p id="analysis-note" class="hint"></p></div>
<button id="regenerate" class="primary" disabled>✦ Tạo lại mô hình 3D</button>
<details class="image-details"><summary>Chỉnh tách nền & chi tiết ảnh</summary>
${parameter('tolerance','Mức tách nền',8,110,1,42)}
${parameter('colors','Số màu cần tách',2,5,1,2)}
${parameter('minArea','Lọc chi tiết nhỏ · pixel',2,80,1,8)}
<p class="hint">Ảnh nền đơn sắc hoặc PNG trong suốt cho kết quả rõ nhất. Ảnh phối cảnh được dựng từ vùng nhìn thấy, chưa tự sửa méo phối cảnh hay tái tạo chiều sâu thật.</p></details>
<hr><h2>Kích thước & hình dáng</h2><label for="image-shape">Mẫu thân / đế</label><select id="image-shape"><option value="contour">Theo đường bao ảnh</option><option value="rounded">Thẻ chữ nhật bo góc</option><option value="circle">Huy hiệu tròn</option><option value="oval">Huy hiệu oval</option><option value="hexagon">Huy hiệu lục giác</option><option value="capsule">Thẻ capsule</option></select>
${parameter('image-width','Chiều rộng thân · mm',20,180,.5,80)}
${parameter('image-border','Viền đế · mm',0,6,.1,1.2)}
${parameter('image-round','Bo cạnh các lớp · mm',0,1.2,.1,.7)}
${parameter('image-smooth','Làm mềm đường viền · mm',0,2,.1,.5)}
<label for="image-side">Lỗ móc</label><select id="image-side"><option value="auto">Tìm lỗ trong ảnh, thiếu thì thêm bên trái</option><option value="left">Thêm tai móc bên trái</option><option value="top">Thêm tai móc phía trên</option><option value="none">Không tạo lỗ xuyên đế</option></select>
${parameter('image-hole','Đường kính lỗ thêm mới · mm',2,10,.1,4)}
${parameter('image-ring','Bề dày tai móc thêm mới · mm',1.2,6,.1,2.4)}
<hr><h2>Màu & độ dày từng lớp</h2>
${parameter('image-base','Độ dày lớp đế · mm',.8,10,.1,2.4)}
<label for="base-palette">Mảng màu dùng làm đế</label><select id="base-palette" disabled><option>Được chọn sau khi tải ảnh</option></select>
<div class="image-base-color"><label for="image-basecolor">Màu đế</label><input id="image-basecolor" type="color" value="#b38add"></div><div id="palette-layers"><p class="hint">Các lớp màu sẽ xuất hiện sau khi phân tích ảnh.</p></div>
</section>
<div class="viewer-shell"><section class="panel viewer image-viewer"><div class="viewer-top"><h2><span class="number">02</span> Mô hình từ ảnh</h2><span class="badge">mm · Xem trực tiếp</span></div><div class="edit-toolbar"><button id="edit-pick" aria-pressed="false">✎ Chọn mảnh để xóa</button><button id="edit-delete" disabled>Xóa mảnh đã chọn</button><button id="edit-undo" disabled>↶ Hoàn tác</button><span id="edit-note">Chọn từng mảnh nổi; đế được giữ lại.</span></div><div id="image-viewport"><div id="image-empty"><b>◇</b><strong>Thả ý tưởng vào đây</strong><span>Tải ảnh lên để tự dựng mô hình 3D</span></div></div><div class="viewer-bottom"><span>Kéo để xoay · Cuộn để phóng to</span><div><button id="image-top">Nhìn từ trên</button> <button id="image-reset">↻ Góc mặc định</button></div></div></section></div>
<section class="panel export"><h2><span class="number">03</span> Xuất để in</h2><div class="material"><i>▧</i><div><strong>Đế + các mảng màu nổi</strong><small>Các phần giữ cùng hệ tọa độ</small></div></div><div class="stats"><div><span>Kích thước</span><b id="image-dimensions">—</b></div><div><span>Tổng chiều cao</span><b id="image-thickness">—</b></div><div><span>Số phần màu</span><b id="image-parts">—</b></div></div>
<div id="image-status" role="status">Chọn ảnh để bắt đầu. Mô hình sẽ được tạo tự động.</div><button id="image-export3mf" class="primary" disabled>↓ Tải 3MF · Các phần màu</button><button id="image-exportstl" class="secondary" disabled>↓ Tải bộ STL</button><div id="image-download"></div><div class="notice">Mở 3MF trong Bambu Studio, gán filament cho từng phần rồi kiểm tra Slice / Preview. Đây là mô hình phù điêu theo màu ảnh; chữ trong ảnh là hình, chưa chỉnh nội dung như ở tool chữ.</div></section>
</main><footer>KEYCRAFT IMAGE STUDIO · Chức năng riêng cho logo và hình ảnh · Không gửi ảnh tới dịch vụ AI.</footer>`;

if(isClicker){
 document.title='Keycraft · Clicker MX từ ảnh';
 document.body.classList.add('clicker-mode');
 document.querySelector('h1').textContent='Ảnh của bạn. Clicker của bạn.';
 document.querySelector('.intro p').textContent='Mặt nút từ ảnh · Ngàm chữ thập MX · Thân giữ switch';
 document.querySelector('.notice').textContent='Bản in tách rời: mặt nút bên trái, vỏ bo theo hình có tai móc bên phải. In ngàm hướng xuống; mặt nút có thể cần support. Gắn các switch MX vào lỗ plate trong vỏ, ấn ngàm mặt nút lên các trục chữ thập tương ứng. Kích thước MX cố định; chỉ chọn số switch. Switch là linh kiện mua riêng. Chưa thử lắp/in vật lý; nên in thử ngàm và plate trước. Tải lại ảnh hoặc tách lại màu sẽ đặt lại phần đã xóa.';
 document.querySelectorAll('.tool-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='/clicker.html'));
 document.getElementById('image-width').value=document.getElementById('image-width-number').value=60;
 document.getElementById('image-side').value='none';
 document.getElementById('palette-layers').insertAdjacentHTML('afterend','<hr><h2>Lắp switch MX</h2>'+parameter('switch-count','Số lượng switch MX',1,4,1,1));
}
const $=id=>document.getElementById(id);
const status=message=>$('image-status').textContent=message;
const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
let imageData=null,analysis=null,baseIndex=-1,paletteColors=[],depths=[],meshes=[],valid=false,fileName='image-keychain',loadId=0,sourceURL=null;
let deletedMarks=[],selectedMesh=null,editMode=false;
let capUnderside=false;
let analysisActive=false,pendingAnalysis=null,lastJob=0,settledJob=0;
const worker=new Worker(new URL('./image-worker.js',import.meta.url),{type:'module'});
const scene=new THREE.Scene();scene.background=new THREE.Color('#f0eef5');
const camera=new THREE.PerspectiveCamera(32,1,.1,2000);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
$('image-viewport').appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=10;orbit.maxDistance=700;
scene.add(new THREE.HemisphereLight(0xffffff,0x817086,2.6));
const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-35,-20,100);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-150,right:150,top:150,bottom:-150});scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.ShadowMaterial({opacity:.15}));floor.position.z=-.05;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(300,30,0xdfd9e8,0xe8e3ed);grid.rotation.x=Math.PI/2;grid.position.z=-.08;scene.add(grid);
const model=new THREE.Group();scene.add(model);
function showCapUnderside(enabled=capUnderside){
  for(const mesh of meshes)if(mesh.name.startsWith('Nut_')){mesh.rotation.x=0;mesh.position.z=0}
  if(enabled){
    const capBox=new THREE.Box3();
    for(const mesh of meshes)if(mesh.name.startsWith('Nut_')){mesh.updateMatrixWorld(true);capBox.expandByObject(mesh)}
    if(!capBox.isEmpty())for(const mesh of meshes)if(mesh.name.startsWith('Nut_')){mesh.rotation.x=Math.PI;mesh.position.z=capBox.max.z;}
  }
  model.updateMatrixWorld(true);
}
if(isClicker){
  $('image-reset').insertAdjacentHTML('beforebegin','<button id="cap-underside" aria-pressed="false">Xem mặt dưới nắp</button> ');
  $('cap-underside').onclick=()=>{capUnderside=!capUnderside;clearSelection();showCapUnderside();$('cap-underside').setAttribute('aria-pressed',String(capUnderside));fit()};
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function updateEditUI(){
  $('edit-pick').setAttribute('aria-pressed',String(editMode));
  $('edit-delete').disabled=!selectedMesh;
  $('edit-undo').disabled=!deletedMarks.length;
  $('edit-note').textContent=selectedMesh?'Mảnh màu cam đang được chọn. Bấm Xóa để loại bỏ.':`Đã xóa ${deletedMarks.length} mảnh. ${editMode?'Bấm mảnh nổi để chọn; tắt chế độ để xoay.':'Chọn từng mảnh nổi; đế được giữ lại.'}`;
  orbit.enabled=!editMode;
  renderer.domElement.style.cursor=editMode?'crosshair':'grab';
}
function clearSelection(){if(selectedMesh)selectedMesh.material.emissive.setHex(0);selectedMesh=null;updateEditUI()}
$('edit-pick').onclick=()=>{editMode=!editMode;clearSelection()};
renderer.domElement.addEventListener('click',event=>{
  if(!editMode||!valid)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(meshes,false)[0];
  clearSelection();
  if(hit?.object.userData.deleteMark){selectedMesh=hit.object;selectedMesh.material.emissive.setHex(0xb94c00)}
  updateEditUI();
});
$('edit-delete').onclick=()=>{
  if(!selectedMesh)return;
  deletedMarks.push({...selectedMesh.userData.deleteMark});clearSelection();build();
};
$('edit-undo').onclick=()=>{if(deletedMarks.length){deletedMarks.pop();clearSelection();build()}};
new ResizeObserver(()=>{const el=$('image-viewport');renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix()}).observe($('image-viewport'));
const invalidate=renderWhenNeeded(renderer,scene,camera,orbit);
function fit(top=false){const box=new THREE.Box3().setFromObject(model),size=meshes.length?box.getSize(new THREE.Vector3()):new THREE.Vector3(90,60,5);const d=Math.max(size.x*2.2/camera.aspect,size.y*2.4,60);camera.position.set(top?0:d*.08,top?0:-d*.6,top?d:d*.8);orbit.target.copy(meshes.length?box.getCenter(new THREE.Vector3()):new THREE.Vector3());camera.position.add(orbit.target);orbit.update()}
$('image-top').onclick=()=>fit(true);$('image-reset').onclick=()=>fit();fit();
function dispose(){clearSelection();for(const mesh of meshes){model.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}meshes=[]}
function exportsEnabled(enabled){$('image-export3mf').disabled=$('image-exportstl').disabled=!enabled}
function number(id){const el=$(id),value=Number(el.value);if(!Number.isFinite(value)||value<Number(el.min)||value>Number(el.max))throw Error('Thông số nằm ngoài khoảng cho phép.');return value}
function settings(){return {baseShape:$('image-shape').value,width:number('image-width'),base:number('image-base'),border:number('image-border'),round:number('image-round'),smooth:number('image-smooth'),hole:number('image-hole'),ring:number('image-ring'),side:$('image-side').value,baseIndex,baseColor:$('image-basecolor').value,colors:paletteColors,depths,editableParts:true,deletedMarks,...(isClicker?{switchCount:number("switch-count")}:{})}}
let modelGeneration=0;
async function build(preview=false){
 const request=++modelGeneration;
  if(!analysis||analysisActive||pendingAnalysis||settledJob!==lastJob)return false;
  exportsEnabled(false);valid=false;
  try{
    const {preview:unusedPreview,...contours}=analysis;
    const result=await requestModel({kind:isClicker?'clicker':'image',analysis:contours,settings:settings(),preview});
    if(request!==modelGeneration||analysisActive||pendingAnalysis||!result){result?.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});return false}
    dispose();meshes=result.meshes;meshes.forEach(m=>model.add(m));showCapUnderside();$('image-empty').classList.add('hidden');
    $('image-dimensions').textContent=`${result.size.x.toFixed(1)} × ${result.size.y.toFixed(1)} mm`;
    $('image-thickness').textContent=`${result.size.z.toFixed(1)} mm`;$('image-parts').textContent=String(new Set(meshes.map(m=>m.material.color.getHexString())).size);
    valid=true;exportsEnabled(true);status(`Đã tạo ${meshes.length} phần 3D. ${result.detectedHole?'Đã dùng vùng lỗ tìm được ở bên trái ảnh; hãy kiểm tra hình xem trước.':'Kiểm tra đường viền và mảng màu trước khi xuất.'}`);
    invalidate();return true;
  }catch(error){if(request===modelGeneration)status(error.message);return false}
}
const schedule=frameScheduler(preview=>{build(preview);orbit.update();renderer.render(scene,camera)});
function bindParameters(root,onChange){
  for(const control of root.querySelectorAll('[data-param]')){
    const slider=control.querySelector('input[type=range]'),input=control.querySelector('input[type=number]');
    const sync=()=>{const percent=(Number(slider.value)-Number(slider.min))/(Number(slider.max)-Number(slider.min))*100;slider.style.setProperty('--progress',percent+'%')};
    slider.oninput=()=>{input.value=slider.value;input.removeAttribute('aria-invalid');sync();onChange(slider.id,true)};
    slider.onchange=()=>onChange(slider.id,false);
    input.oninput=()=>{const ok=input.value!==''&&input.validity.valid;input.setAttribute('aria-invalid',String(!ok));if(ok){slider.value=input.value;sync();onChange(slider.id,false)}};
    input.onchange=()=>{if(input.value===''||!input.validity.valid)input.value=slider.value;input.removeAttribute('aria-invalid');slider.value=input.value;sync();onChange(slider.id,false)};
    sync();
  }
}
bindParameters(document, (id,preview)=>{if(['tolerance','colors','minArea'].includes(id))queueAnalysis();else schedule(preview)});
$('image-shape').onchange=()=>schedule(false);
$('image-side').onchange=()=>schedule(false);
$('image-basecolor').oninput=()=>schedule(false);
function renderPalette(){
  $('base-palette').disabled=false;
  $('base-palette').innerHTML='<option value="-1">Đế màu riêng · nâng nổi tất cả màu ảnh</option>'+analysis.palette.map((p,k)=>`<option value="${k}">Màu ${k+1} · ${hex(p.rgb)}</option>`).join('');
  $('base-palette').value=String(baseIndex);
  $('palette-layers').innerHTML=analysis.palette.map((p,k)=>k===baseIndex?'':`<div class="color-layer"><div class="color-layer-title"><input id="palette-color-${k}" type="color" value="${paletteColors[k]}" aria-label="Màu nổi ${k+1}"><strong>Mảng màu ${k+1}</strong></div>${parameter(`depth-${k}`,'Độ dày lớp nổi · mm',.2,8,.1,depths[k])}</div>`).join('');
  for(let k=0;k<paletteColors.length;k++){const el=$(`palette-color-${k}`);if(el)el.oninput=()=>{paletteColors[k]=el.value;schedule(false)}}
  bindParameters($('palette-layers'),(id,preview)=>{depths[Number(id.split('-')[1])]=number(id);schedule(preview)});
}
$('base-palette').onchange=()=>{baseIndex=Number($('base-palette').value);if(baseIndex>=0)$('image-basecolor').value=paletteColors[baseIndex];renderPalette();schedule(false)};
function startAnalysis(request){analysisActive=true;worker.postMessage(request,[request.pixels.buffer])}
function queueAnalysis(){
  if(!imageData)return;
  const request={id:++lastJob,pixels:imageData.data.slice(),width:imageData.width,height:imageData.height,tolerance:number('tolerance'),colorCount:number('colors'),minArea:number('minArea')};
  valid=false;exportsEnabled(false);status('Đang tách nền, gom màu và tìm đường viền…');
  $('regenerate').disabled=true;
  if(analysisActive)pendingAnalysis=request;else startAnalysis(request);
}
worker.onmessage=async({data})=>{
  analysisActive=false;
  if(pendingAnalysis){const request=pendingAnalysis;pendingAnalysis=null;startAnalysis(request);return}
  if(data.id!==lastJob)return;
  settledJob=data.id;$('regenerate').disabled=false;
  if(data.error){analysis=null;dispose();$('image-empty').classList.remove('hidden');status(data.error);return}
  deletedMarks=[];updateEditUI();analysis=data.result;baseIndex=analysis.palette.length===1?-1:analysis.baseIndex;
  paletteColors=analysis.palette.map(p=>hex(p.rgb));depths=analysis.palette.map(()=>1.6);
  if(baseIndex>=0)$('image-basecolor').value=paletteColors[baseIndex];
  const canvas=$('image-mask');canvas.width=analysis.width;canvas.height=analysis.height;canvas.getContext('2d').putImageData(new ImageData(analysis.preview,analysis.width,analysis.height),0,0);
  $('analysis-note').textContent=`Đã tách ${analysis.palette.length} màu ${analysis.usesAlpha?'từ nền trong suốt':'từ nền ảnh'}.${analysis.touchesEdge?' Hình chạm mép ảnh; hãy kiểm tra phần bị cắt.':''} Bản xem bên cạnh là mô hình thực sẽ xuất.`;
  renderPalette();await build();fit();
};
worker.onerror=()=>{analysisActive=false;pendingAnalysis=null;valid=false;exportsEnabled(false);$('regenerate').disabled=false;status('Không chạy được bộ xử lý ảnh. Hãy tải lại trang rồi thử lại.')};
$('regenerate').onclick=queueAnalysis;
async function loadImage(url,name){
  const current=++loadId;lastJob++;pendingAnalysis=null;imageData=null;analysis=null;valid=false;exportsEnabled(false);$('regenerate').disabled=true;status('Đang đọc ảnh…');
  try{
    const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Không đọc được ảnh. Hãy dùng PNG, JPG hoặc WEBP.'));img.src=url});
    if(current!==loadId)return;
    if(img.naturalWidth*img.naturalHeight>40000000)throw Error('Ảnh quá lớn. Hãy giảm xuống dưới 40 megapixel.');
    const factor=Math.min(1,720/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
    canvas.width=Math.max(8,Math.round(img.naturalWidth*factor));canvas.height=Math.max(8,Math.round(img.naturalHeight*factor));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(sourceURL?.startsWith('blob:'))URL.revokeObjectURL(sourceURL);sourceURL=url;
    $('image-original').src=url;$('image-review').classList.remove('hidden');fileName=name.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_-]/gu,'_')||'image-keychain';
    queueAnalysis();
  }catch(error){if(url.startsWith('blob:'))URL.revokeObjectURL(url);if(current===loadId){dispose();$('image-empty').classList.remove('hidden');status(error.message)}}
}
$('image-upload').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;if(file.size>15*1024*1024)return status('Ảnh cần nhỏ hơn 15 MB.');
  await loadImage(URL.createObjectURL(file),file.name);
};
$('example').onclick=()=>loadImage('/examples/'+$('example-design').value,'sample-design');
document.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>{const mask=button.dataset.review==='mask';$('image-original').classList.toggle('hidden',mask);$('image-mask').classList.toggle('hidden',!mask);document.querySelectorAll('[data-review]').forEach(b=>b.classList.toggle('active',b===button))});
let downloadURL;
async function save(type){
  if(!valid||!await build(false))return;
  exportsEnabled(false);status('Đang đóng gói file mô hình…');
  try{
    showCapUnderside(false);
    const bytes=type==='3mf'?await export3MF(meshes):await exportSTLs(meshes,isClicker?document.querySelector('.notice').textContent:undefined);
    if(downloadURL)URL.revokeObjectURL(downloadURL);
    downloadURL=URL.createObjectURL(new Blob([bytes],{type:type==='3mf'?'model/3mf':'application/zip'}));
    const link=document.createElement('a');link.href=downloadURL;link.download=`${fileName}.${type==='3mf'?'3mf':'zip'}`;link.textContent='Tải lại file vừa tạo';
    $('image-download').replaceChildren(link);link.click();status('Đã tạo file. Mở trong Bambu Studio và kiểm tra các lớp màu trước khi in.');
  }catch(error){status(`Không xuất được file: ${error.message}`)}finally{showCapUnderside();exportsEnabled(valid)}
}
$('image-export3mf').onclick=()=>save('3mf');$('image-exportstl').onclick=()=>save('stl');




mountStudio(isClicker?'clicker':'image');
window.addEventListener('keycraft:fit',()=>fit());
