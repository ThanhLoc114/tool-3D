import extraFonts from './font-catalog-extra.json';
import {export3MF} from './model-export.js';
import { mountStudio } from './studio-ui.js';
import { renderWhenNeeded } from './render-loop.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { mergeVertices, mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import opentype from 'opentype.js';
import ClipperLib from 'clipper-lib';
import JSZip from 'jszip';
import './style.css';
import { mountParameterControls, frameScheduler } from './parameter-controls.js';

document.querySelector('#app').innerHTML = `
<header><div class="brand"><b>◇</b><span>keycraft<span>XƯỞNG MÓC KHÓA 3D</span></span></div><small>● Thiết kế cho quy trình in FDM</small></header>
<nav class="tool-nav"><a href="/" class="active">Móc khóa chữ</a><a href="/image.html">✦ Móc khóa từ ảnh</a><a href="/clicker.html">▣ Clicker từ ảnh</a><a href="/qr.html">▦ QR từ ảnh</a><a href="/baby.html">♡ Kỷ niệm bé</a></nav><div class="intro"><div><h1>Từ ý tưởng đến chiếc móc khóa của bạn.</h1><p>Tạo mẫu, thay tên và xuất mô hình 3D trong cùng một nơi.</p></div><span class="step">01 Thiết kế &nbsp; → &nbsp; 02 Xem trước &nbsp; → &nbsp; 03 In 3D</span></div>
<main><section class="panel"><h2><span class="number">01</span> Thiết kế của bạn</h2>
<div class="tabs"><button class="active" data-mode="text">Móc khóa chữ</button><button data-mode="image">Ảnh / logo phẳng</button></div>
<label class="drop"><strong>↥ &nbsp; Thêm ảnh tham khảo</strong><span>PNG, JPG, WEBP · tối đa 15 MB</span><input id="upload" type="file" accept="image/png,image/jpeg,image/webp"></label>
<img id="reference" class="hidden" alt="Ảnh tham khảo đã tải lên"><button id="ocr" class="smallbutton hidden">Nhận diện chữ từ ảnh</button>
<div id="text-controls"><label for="name">Nội dung móc khóa</label><input id="name" type="text" value="DUYEN" maxlength="35" aria-label="Nội dung móc khóa"><label for="font-search">Tìm phông chữ</label><input id="font-search" type="search" placeholder="Nhập tên phông, ví dụ: Bungee, Lobster…"><label for="font-group">Lọc nhóm phông</label><select id="font-group"><option value="all">Tất cả · 100 phông</option><option value="vietnamese">Hỗ trợ tiếng Việt đầy đủ</option><option value="Viết tay">Viết tay</option><option value="Có chân">Có chân</option><option value="Đậm / trang trí">Đậm / trang trí</option><option value="Không chân">Không chân</option></select><p id="font-results" class="hint"></p><label for="font">Chọn phông chữ · 100 lựa chọn</label><select id="font"><option value="default">Noto Sans · Đậm, hỗ trợ tiếng Việt</option></select><label class="drop" style="padding:8px;margin-top:8px"><span>Thêm font .ttf / .otf của bạn</span><input id="fontfile" type="file" accept=".ttf,.otf"></label><p class="hint">100 phông chữ có sẵn. Nhóm phông chỉ là bộ lọc; chọn phông cụ thể ở danh sách ngay phía trên. Chỉ tải phông khi chọn. Baloo 2 và Fredoka phù hợp kiểu móc khóa tròn mập như mẫu.</p></div>
<div id="image-controls" class="hidden"><label>Ngưỡng tách hình <output id="threshold-value">150</output></label><input id="threshold" type="range" min="10" max="245" value="150"><label class="check"><input id="invert" type="checkbox">Lấy phần sáng thay cho phần tối</label><canvas id="mask" width="200" height="120"></canvas><p class="hint">Dùng logo nhìn thẳng, nền đơn sắc. Màu tím trong bản xem trước bên trên là phần sẽ được dựng nổi. Ảnh phối cảnh cần được vẽ lại hoặc chuyển sang chế độ chữ.</p></div>
<hr><div class="range-label"><label>Chiều rộng thân (không tính tai móc)</label><output id="width-value"></output></div><input id="width" type="range" min="30" max="150" step="1" value="75">
<div class="parameter-group"><div><label for="base">Lớp 1 · Độ dày đế (mm)</label><input id="base" type="number" min="1" max="8" step="0.2" value="2.4"></div><div><label for="relief">Lớp 2 · Độ dày chữ (mm)</label><input id="relief" type="number" min="0.4" max="8" step="0.2" value="2"></div></div>
<div class="layer-stack"><div class="layer-top">Lớp 2 · Chữ / họa tiết</div><div class="layer-base">Lớp 1 · Đế liền khối</div></div>
<div class="parameter-group"><div><label for="baseRound">Bo cạnh đế · mm</label><input id="baseRound" type="number" min="0" max="1.2" step="0.1" value="0.4"></div><div><label for="topRound">Bo cạnh chữ · mm</label><input id="topRound" type="number" min="0" max="1.5" step="0.1" value="0.7"></div></div><p class="hint">Khi bật viền nổi, thành ngoài đế và viền giữ thẳng để hai màu nối phẳng. Bo = 0 để giữ cạnh thẳng. Độ dày từng lớp đã bao gồm phần bo. Chi tiết mảnh sẽ tự giảm độ bo để giữ hình.</p><button id="softPreset" class="smallbutton">✦ Áp dụng kiểu mềm mại như mẫu</button>
<div class="range-label"><label>Viền đế</label><output id="border-value"></output></div><input id="border" type="range" min="1" max="6" step="0.2" value="2.4">
<div class="parameter-group"><div><label for="hole">Đường kính lỗ · mm</label><input id="hole" type="number" min="2" max="8" step="0.2" value="4"></div><div><label for="ring">Bề dày tai móc · mm</label><input id="ring" type="number" min="1.2" max="5" step="0.2" value="2.4"></div></div>
<div class="parameter-group"><div><label for="rimHeight">Độ cao viền nổi · mm (0 = tắt)</label><input id="rimHeight" type="number" min="0" max="8" step="0.1" value="2"></div><div><label for="rimWidth">Độ rộng viền nổi · mm</label><input id="rimWidth" type="number" min="0.4" max="2" step="0.1" value="0.8"></div></div><label for="bodyStyle">Kiểu dáng thân</label><select id="bodyStyle"><option value="contour">Đường bao chữ</option><option value="capsule">Thẻ capsule</option><option value="oval">Bảng oval</option><option value="ticket">Thẻ bo nhỏ</option></select><label for="side">Vị trí tai móc</label><select id="side"><option value="left">Bên trái</option><option value="top">Phía trên, chính giữa</option><option value="none">Không có tai móc</option></select>
</section><div class="viewer-shell"><section class="panel viewer"><div class="viewer-top"><h2><span class="number">02</span> Xem trước 3D</h2><span class="badge">Kích thước thực · mm</span></div><div id="viewport"></div><div class="viewer-bottom"><span>Kéo để xoay · Cuộn để phóng to</span><div><button id="top">Nhìn từ trên</button> <button id="reset">↻ Góc mặc định</button></div></div></section>
</div><section class="panel export"><h2><span class="number">03</span> Sẵn sàng để in</h2><div class="material"><i>▱</i><div><strong>Mô hình hai lớp màu</strong><small>Mặt phẳng đặt trên bàn in · Z = 0</small></div></div>
<label>Màu đế</label><div class="swatches"><input id="basecolor" type="color" value="#b38add"><span>Tím lavender</span></div><label>Màu chữ / họa tiết</label><div class="swatches"><input id="topcolor" type="color" value="#fff9ef"><span>Trắng kem</span></div><hr>
<div class="stats"><div><span>Kích thước</span><b id="dimensions">—</b></div><div><span>Tổng độ dày</span><b id="thickness">4.4 mm</b></div><div><span>Bo thực tế · đế / chữ</span><b id="actual-round">—</b></div><div><span>Thành phần</span><b>Đế + lớp nổi</b></div></div><div id="status" role="status">Đang tải font và chuẩn bị mô hình…</div>
<button class="primary" id="export3mf" disabled>↓ &nbsp; Tải 3MF · giữ hai phần màu</button><button class="secondary" id="exportstl" disabled>↓ &nbsp; Tải bộ STL cho Bambu Studio</button><button class="secondary" id="save">Lưu thiết kế .json</button><label class="drop" style="padding:8px;margin-top:10px"><span>Mở thiết kế .json</span><input id="load" type="file" accept=".json"></label>
<div class="notice">Mở 3MF trong Bambu Studio, chọn filament cho từng phần và kiểm tra Preview sau khi Slice. 3MF có gán filament theo màu từng phần. Kiểm tra lại màu và ánh xạ cuộn AMS trước khi in; STL không lưu màu. Có thể đổi filament theo lớp vì chữ nằm trên đế.</div></section></main><footer>KEYCRAFT STUDIO &nbsp; / &nbsp; Bản đầu tiên · Dựng chữ tham số và phù điêu từ ảnh phẳng, xử lý trong trình duyệt.</footer>`;

const $ = id => document.getElementById(id);
const FONT_CATALOG=[
  {id:'baloo',file:'Baloo2.ttf',label:'Baloo 2 ExtraBold · Tròn mập, gần mẫu'},
  {id:'fredoka',file:'Fredoka.ttf',label:'Fredoka Bold · Bong bóng mềm mại'},
  {id:'nunito',file:'Nunito.ttf',label:'Nunito Black · Bo tròn gọn gàng'},
  {id:'quicksand',file:'Quicksand.ttf',label:'Quicksand Bold · Tròn thanh thoát'},
  {id:'lilita',file:'LilitaOne.ttf',label:'Lilita One · Vui nhộn (chữ Latin)'},
  {id:'default',file:'NotoSans-Bold.ttf',label:'Noto Sans Bold · Nét thẳng rõ ràng'},
 
...extraFonts.map(f=>({...f,label:f.label+(f.vietnamese?' · Tiếng Việt':' · Có chữ dự phòng')}))
];
$('font').innerHTML=FONT_CATALOG.map(f=>`<option value="${f.id}">${f.label}</option>`).join('');

function filterFonts(){const current=$('font').value,query=$('font-search').value.trim().toLocaleLowerCase('vi'),group=$('font-group').value;const found=FONT_CATALOG.filter(f=>(f.label+' '+(f.group||'Không chân')).toLocaleLowerCase('vi').includes(query)&&(group==='all'||group==='vietnamese'&&(f.vietnamese||['baloo','nunito','default'].includes(f.id))||f.group===group));const selected=FONT_CATALOG.find(f=>f.id===current);const options=selected&&!found.includes(selected)?[selected,...found]:found;$('font').innerHTML=options.map(f=>`<option value="${f.id}">${f.label}</option>`).join('');if(current==='custom')$('font').add(new Option('Phông đã tải lên','custom'));$('font').value=current;$('font-results').textContent=found.length+' / 100 phông khớp bộ lọc'+(selected&&!found.includes(selected)?' · Giữ phông đang chọn.':'');}
$('font-search').oninput=filterFonts;$('font-group').onchange=filterFonts;$('font-results').textContent='100 phông · Mở danh sách Chọn phông chữ bên dưới.';
const fontCache=new Map();
const SCALE = 1000;
let fallbackFont;
function glyphPath(text){const path=new opentype.Path();let x=0,previous=null,previousFont=null;for(const char of text.normalize('NFC')){const chosen=font.hasChar(char)?font:fallbackFont;if(!chosen?.hasChar(char))throw Error(`Chưa có phông hỗ trợ ký tự “${char}”.`);const scale=100/chosen.unitsPerEm,glyph=chosen.charToGlyph(char);if(previous&&previousFont===chosen)x+=chosen.getKerningValue(previous,glyph)*scale;path.extend(glyph.getPath(x,0,100));x+=(glyph.advanceWidth||chosen.unitsPerEm/2)*scale;previous=glyph;previousFont=chosen}return path}
let mode='text', font, customFontBuffer=null, sourceImage=null, imageURL=null, parts=[], valid=false;
const status = message => $('status').textContent=message;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#f0eef5');
const camera=new THREE.PerspectiveCamera(32,1,0.1,2000); camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
$('viewport').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minDistance=15; controls.maxDistance=500;
scene.add(new THREE.HemisphereLight(0xffffff,0x776785,2.6));
const light=new THREE.DirectionalLight(0xffffff,3.2); light.position.set(-35,-20,100); light.castShadow=true; light.shadow.mapSize.set(2048,2048); Object.assign(light.shadow.camera,{left:-120,right:120,top:120,bottom:-120}); scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.ShadowMaterial({opacity:.13})); floor.position.z=-.05;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(300,30,0xdfd9e8,0xe8e3ed); grid.rotation.x=Math.PI/2;grid.position.z=-.08;scene.add(grid);
const model=new THREE.Group();scene.add(model);
new ResizeObserver(()=>{const el=$('viewport');renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix()}).observe($('viewport'));
const invalidate=renderWhenNeeded(renderer,scene,camera,controls);
function view(top=false){
  const w=valid?new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).x:90;
  const distance=w*Math.max(2.2,2.2/camera.aspect);
  camera.position.set(top?0:distance*.08,top?0:-distance*.6,top?distance:distance*.8);
  controls.target.set(0,0,0);controls.update();
}
$('top').onclick=()=>view(true);$('reset').onclick=()=>view();view();
function number(id){const el=$(id), n=Number(el.value);if(!Number.isFinite(n)||n<Number(el.min)||n>Number(el.max))throw Error(`Giá trị ${id} ngoài khoảng ${el.min}–${el.max}.`);return n}
let outlineCache;
const roundedShapeCache=new WeakMap();
function orient(path,outer=true){if(ClipperLib.Clipper.Orientation(path)!==outer)path.reverse();return path}
function pathFromPoints(points,outer){return orient(points.map(p=>({X:Math.round(p.x*SCALE),Y:Math.round(p.y*SCALE)})),outer)}
function boolean(subject,clip=[],type=ClipperLib.ClipType.ctUnion){const c=new ClipperLib.Clipper();c.StrictlySimple=true;c.AddPaths(ClipperLib.Clipper.CleanPolygons(subject,2),ClipperLib.PolyType.ptSubject,true);if(clip.length)c.AddPaths(clip,ClipperLib.PolyType.ptClip,true);const tree=new ClipperLib.PolyTree();c.Execute(type,tree,ClipperLib.PolyFillType.pftNonZero,ClipperLib.PolyFillType.pftNonZero);return tree}
function flat(tree){return ClipperLib.Clipper.PolyTreeToPaths(tree)}
function offset(paths,delta){const co=new ClipperLib.ClipperOffset(2,20);co.AddPaths(paths,ClipperLib.JoinType.jtRound,ClipperLib.EndType.etClosedPolygon);const out=new ClipperLib.Paths();co.Execute(out,delta*SCALE);return out}
function roundedGeometry(tree,height,z,requested,preview=false){
  // Inset the cap before beveling outward so the design footprint and total height stay fixed.
  let radius=Math.min(requested,height*.45);
  const radiusKey=radius;
  let cache=roundedShapeCache.get(tree);
  if(!cache){cache=new Map();roundedShapeCache.set(tree,cache)}
  const cached=cache.get(radiusKey);
  const original=ClipperLib.JS.PolyTreeToExPolygons(tree);
  let inset;
  if(cached){radius=cached.radius;inset=cached.inset}
  else while(radius>.015){
    const candidate=boolean(offset(flat(tree),-radius));
    const regions=ClipperLib.JS.PolyTreeToExPolygons(candidate);
    if(regions.length===original.length&&regions.every((p,i)=>p.holes.length===original[i].holes.length)){inset=candidate;break}
    radius*=.65;
  }
  if(!inset)radius=0;
  const shapeList=cached?.shapes||shapes(inset||tree);
  if(!cached)cache.set(radiusKey,{radius,inset,shapes:shapeList});
  const source=new THREE.ExtrudeGeometry(shapeList,{
    depth:height-2*radius,steps:1,bevelEnabled:radius>0,
    bevelSize:radius,bevelThickness:radius,bevelSegments:preview?3:8,curveSegments:20
  });
  source.translate(0,0,z+radius);
  const vertices=source.getAttribute('position');
  for(let i=0;i<vertices.count;i++){const value=vertices.getZ(i);if(Math.abs(value-z)<1e-6)vertices.setZ(i,z);else if(Math.abs(value-z-height)<1e-6)vertices.setZ(i,z+height)}
  if(preview){source.userData.actualRadius=radius;return source}
  source.deleteAttribute('normal');source.deleteAttribute('uv');
  const welded=mergeVertices(source,1e-5);welded.computeVertexNormals();
  const flatResult=welded.toNonIndexed();const result=radius===0?toCreasedNormals(flatResult,Math.PI/3):flatResult;result.userData.actualRadius=radius;result.parameters=source.parameters;
  source.dispose();welded.dispose();return result;
}
// Remove sub-print-resolution contacts in font outlines before triangulation.
// Some glyphs contain tiny islands touching at a single point, which creates non-manifold edges.
function printableTree(paths){return boolean(offset(offset(flat(boolean(paths)),-.025),.025))}
function shapes(tree){return ClipperLib.JS.PolyTreeToExPolygons(tree).map(p=>{const shape=new THREE.Shape(ClipperLib.Clipper.CleanPolygon(p.outer,5).map(v=>new THREE.Vector2(v.X/SCALE,v.Y/SCALE)));for(const hole of p.holes)shape.holes.push(new THREE.Path(ClipperLib.Clipper.CleanPolygon(hole,5).map(v=>new THREE.Vector2(v.X/SCALE,v.Y/SCALE))));return shape})}
function circle(x,y,r){return orient(Array.from({length:96},(_,i)=>({X:Math.round((x+r*Math.cos(i/96*Math.PI*2))*SCALE),Y:Math.round((y+r*Math.sin(i/96*Math.PI*2))*SCALE)})))}
function connectBase(tree){let islands=ClipperLib.JS.PolyTreeToExPolygons(tree).map(p=>p.outer);if(islands.length<2)return tree;islands.sort((a,b)=>Math.abs(ClipperLib.Clipper.Area(b))-Math.abs(ClipperLib.Clipper.Area(a)));let joined=islands.shift(),all=[joined];for(const island of islands){let best=Infinity,pair;const strideA=Math.max(1,Math.floor(joined.length/250)),strideB=Math.max(1,Math.floor(island.length/250));for(let i=0;i<joined.length;i+=strideA)for(let j=0;j<island.length;j+=strideB){const a=joined[i],b=island[j],d=(a.X-b.X)**2+(a.Y-b.Y)**2;if(d<best){best=d;pair=[a,b]}}const co=new ClipperLib.ClipperOffset(2,20),bridge=[];co.AddPath(pair,ClipperLib.JoinType.jtRound,ClipperLib.EndType.etOpenRound);co.Execute(bridge,1.2*SCALE);all.push(island,...bridge);joined=joined.concat(island)}return boolean(all)}
function bounds(paths){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of paths)for(const v of p){minX=Math.min(minX,v.X/SCALE);maxX=Math.max(maxX,v.X/SCALE);minY=Math.min(minY,v.Y/SCALE);maxY=Math.max(maxY,v.Y/SCALE)}return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY}}

function textPaths(){if(!font)throw Error('Font đang được tải.');const text=$('name').value.trim();if(!text)throw Error('Nhập tên hoặc nội dung móc khóa.');const raw=glyphPath(text);const sp=new THREE.ShapePath();for(const c of raw.commands){switch(c.type){case 'M':sp.moveTo(c.x,-c.y);break;case 'L':sp.lineTo(c.x,-c.y);break;case 'Q':sp.quadraticCurveTo(c.x1,-c.y1,c.x,-c.y);break;case 'C':sp.bezierCurveTo(c.x1,-c.y1,c.x2,-c.y2,c.x,-c.y);break;case 'Z':sp.currentPath.closePath();break}}const paths=[];for(const s of sp.toShapes(false)){paths.push(pathFromPoints(s.getPoints(14),true));for(const hole of s.holes)paths.push(pathFromPoints(hole.getPoints(14),false))}return paths}
// Pixel boundary tracing: cancel shared cell edges, then join remaining directed edges.
function imagePaths(){if(!sourceImage)throw Error('Tải logo hoặc ảnh phẳng để tạo mô hình.');const c=document.createElement('canvas');const factor=240/Math.max(sourceImage.naturalWidth,sourceImage.naturalHeight);c.width=Math.max(1,Math.round(sourceImage.naturalWidth*factor));c.height=Math.max(1,Math.round(sourceImage.naturalHeight*factor));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(sourceImage,0,0,c.width,c.height);const {data}=ctx.getImageData(0,0,c.width,c.height);const mask=new Uint8Array(c.width*c.height),threshold=number('threshold');for(let i=0;i<mask.length;i++){const lum=.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2];mask[i]=data[i*4+3]>128&&($('invert').checked?lum>threshold:lum<threshold)?1:0}const preview=$('mask');preview.width=c.width;preview.height=c.height;const pc=preview.getContext('2d'),pd=pc.createImageData(c.width,c.height);for(let i=0;i<mask.length;i++){pd.data.set(mask[i]?[157,119,204,255]:[247,244,251,255],i*4)}pc.putImageData(pd,0,0);
const edges=new Map();const key=(x,y)=>`${x},${y}`;const add=(x,y,a,b)=>{const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push([a,b])};const on=(x,y)=>x>=0&&y>=0&&x<c.width&&y<c.height&&mask[y*c.width+x];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(on(x,y)){if(!on(x,y-1))add(x,y,x+1,y);if(!on(x+1,y))add(x+1,y,x+1,y+1);if(!on(x,y+1))add(x+1,y+1,x,y+1);if(!on(x-1,y))add(x,y+1,x,y)}
const paths=[];while(edges.size){const start=edges.keys().next().value;let current=start,p=[],guard=0;do{const [x,y]=current.split(',').map(Number);p.push({X:x*SCALE,Y:-y*SCALE});const options=edges.get(current);if(!options?.length)break;const next=options.pop();if(!options.length)edges.delete(current);current=key(...next);if(++guard>240*240*4)throw Error('Không thể nối đường viền ảnh.')}while(current!==start);if(current===start&&p.length>=4&&Math.abs(ClipperLib.Clipper.Area(p))>3*SCALE*SCALE)paths.push(p)}
// Screen-space tracing reverses winding when Y is flipped.
for(const p of paths)p.reverse();return ClipperLib.Clipper.CleanPolygons(paths,.45*SCALE)}
function clear(){for(const mesh of [...model.children]){model.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}parts=[]}
function build(preview=false){syncParameterControls();valid=false;$('exportstl').disabled=$('export3mf').disabled=true;try{const width=number('width'),base=number('base'),relief=number('relief'),border=number('border'),hole=number('hole'),ring=number('ring'),baseRound=number('baseRound'),topRound=number('topRound');$('width-value').textContent=`${width} mm`;$('border-value').textContent=`${border.toFixed(1)} mm`;$('threshold-value').textContent=$('threshold').value;const outlineKey=JSON.stringify([mode,$('name').value,width,border,hole,ring,$('side').value,$('threshold').value,$('invert').checked,$('bodyStyle').value]);
const source=mode==='text'?font:sourceImage;
let design;
if(outlineCache?.key===outlineKey&&outlineCache.source===source){design=outlineCache.design}
else {
let paths=mode==='text'?textPaths():imagePaths();if(!paths.length)throw Error('Không tìm thấy hình. Hãy đổi ngưỡng hoặc dùng ảnh khác.');let b=bounds(paths);if(!b.w||!b.h)throw Error('Đường viền không hợp lệ.');const factor=(width-2*border)/b.w;paths=paths.map(p=>p.map(v=>({X:Math.round((v.X-(b.minX+b.maxX)/2*SCALE)*factor),Y:Math.round((v.Y-(b.minY+b.maxY)/2*SCALE)*factor)})));const topTree=printableTree(paths);paths=flat(topTree);let basePaths=offset(paths,border);let baseTree=boolean(basePaths);
// Fill glyph counters in the base. All text sits on a continuous support plate.
basePaths=ClipperLib.JS.PolyTreeToExPolygons(baseTree).map(p=>orient(p.outer,true));
if(basePaths.length>1){const bb=bounds(basePaths);const y=(bb.minY+bb.maxY)/2;const half=Math.max(1,Math.min(2,(bb.maxY-bb.minY)/5));basePaths.push(orient([{X:bb.minX*SCALE,Y:(y-half)*SCALE},{X:bb.maxX*SCALE,Y:(y-half)*SCALE},{X:bb.maxX*SCALE,Y:(y+half)*SCALE},{X:bb.minX*SCALE,Y:(y+half)*SCALE}]))}
baseTree=connectBase(boolean(basePaths));
// Close deeper notches around punctuation so the support plate has a broader neck.
// Only the base contour changes; raised lettering keeps its original glyph paths.
const neckRadius=mode==='text'&&/[.,:;]/.test($('name').value)?Math.max(2.8,border):.8;
baseTree=boolean(offset(offset(flat(baseTree),neckRadius),-neckRadius));b=bounds(flat(baseTree));
if($('bodyStyle').value!=='contour'){
 const cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2,w=b.w+2,h=b.h+2,style=$('bodyStyle').value;
 if(style==='oval')baseTree=boolean([Array.from({length:128},(_,i)=>({X:Math.round((cx+w/Math.SQRT2*Math.cos(i*Math.PI/64))*SCALE),Y:Math.round((cy+h/Math.SQRT2*Math.sin(i*Math.PI/64))*SCALE)}))]);
 else {const r=style==='capsule'?Math.min(h/2-1,w/4):2;const corners=[[-w/2+r,-h/2+r],[w/2-r,-h/2+r],[w/2-r,h/2-r],[-w/2+r,h/2-r]].map(([x,y])=>({X:Math.round((cx+x)*SCALE),Y:Math.round((cy+y)*SCALE)}));baseTree=boolean(offset([corners],r))}b=bounds(flat(baseTree));
}let cut=[];if($('side').value!=='none'){const r=hole/2+ring;const x=$('side').value==='left'?b.minX-r+Math.min(ring,2):0;const y=$('side').value==='left'?(b.minY+b.maxY)/2:b.maxY+r-Math.min(ring,2);baseTree=connectBase(boolean([...flat(baseTree),circle(x,y,r)]));cut=[circle(x,y,hole/2)];baseTree=boolean(flat(baseTree),cut,ClipperLib.ClipType.ctDifference)}
const topFinal=cut.length?boolean(paths,cut,ClipperLib.ClipType.ctDifference):topTree;
design={baseTree,topFinal};outlineCache={key:outlineKey,source,design};
}
const {baseTree,topFinal}=design;
const baseShapes=shapes(baseTree),topShapes=shapes(topFinal);if(!baseShapes.length||!topShapes.length)throw Error('Không tạo được bề mặt kín.');const staged=[];try{for(const [name,tree,depth,z,color,round] of [['De',baseTree,base,0,$('basecolor').value,baseRound],['Chu',topFinal,relief,base,$('topcolor').value,topRound]]){let geometry=roundedGeometry(tree,depth,z,name==='De'&&number('rimHeight')>0?0:round,preview);if(name==='Chu'&&number('rimHeight')>0){const inset=offset(flat(baseTree),-Math.min(number('rimWidth'),border*.65));const rimTree=boolean(flat(baseTree),inset,ClipperLib.ClipType.ctDifference);const separated=boolean(flat(rimTree),offset(flat(topFinal),.15),ClipperLib.ClipType.ctDifference);const rim=roundedGeometry(separated,number('rimHeight'),base,0,preview);const radius=geometry.userData.actualRadius,parameters=geometry.parameters;const merged=mergeGeometries([geometry,rim]);geometry.dispose();rim.dispose();geometry=merged;geometry.userData.actualRadius=radius;geometry.parameters=parameters}const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.36,metalness:0}));mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;staged.push(mesh)}}catch(error){for(const mesh of staged){mesh.geometry.dispose();mesh.material.dispose()}throw error}clear();for(const mesh of staged){model.add(mesh);parts.push(mesh)}
const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());for(const mesh of parts)mesh.geometry.translate(-center.x,-center.y,0);const size=box.getSize(new THREE.Vector3());$('dimensions').textContent=`${size.x.toFixed(1)} × ${size.y.toFixed(1)} mm`;$('thickness').textContent=`${(base+Math.max(relief,number('rimHeight'))).toFixed(1)} mm`;$('actual-round').textContent=parts.map(p=>p.geometry.userData.actualRadius.toFixed(2)).join(' / ')+' mm';invalidate();valid=true;$('exportstl').disabled=$('export3mf').disabled=false;status(mode==='text'?([...$('name').value.normalize('NFC')].some(c=>!font.hasChar(c))?'Đã dựng mô hình. Ký tự còn thiếu dùng phông tiếng Việt dự phòng.':'Đã dựng mô hình. Chữ có thể sửa và xuất lại.'):'Đã dựng phù điêu một màu từ đường viền ảnh.');if(size.y>180)status('Mẫu quá cao. Hãy giảm chiều rộng hoặc chọn ảnh có tỷ lệ phù hợp.');}catch(e){invalidate();status(e.message+(parts.length?' Đang giữ bản xem trước cũ; chưa thể xuất thông số mới.':''))}}
let timer; // Geometry tests extract the modeling functions above this boundary.
const schedule=frameScheduler(preview=>{
  build(preview);
  controls.update();
  renderer.render(scene,camera);
});
const syncParameterControls=mountParameterControls(schedule);
for(const id of ['name','side','invert','bodyStyle'])$(id).addEventListener('input',()=>schedule(false));
for(const id of ['basecolor','topcolor'])$(id).oninput=()=>{const i=id==='basecolor'?0:1;parts[i]?.material.color.set($(id).value)};
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));$('text-controls').classList.toggle('hidden',mode!=='text');$('image-controls').classList.toggle('hidden',mode!=='image');build();view()});
async function loadImage(url){const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Không đọc được ảnh.'));img.src=url});if(img.naturalWidth*img.naturalHeight>40000000)throw Error('Ảnh quá lớn. Hãy giảm xuống dưới 40 megapixel.');sourceImage=img;imageURL=url;$('reference').src=url;$('reference').classList.remove('hidden');$('ocr').classList.remove('hidden');build()}
$('upload').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>15*1024*1024)return status('Ảnh cần nhỏ hơn 15 MB.');try{const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});await loadImage(url)}catch(e){status(e.message)}};
$('ocr').onclick=async()=>{if(!sourceImage)return;let worker;$('ocr').disabled=true;status('Đang tải bộ nhận diện và đọc chữ… Lần đầu cần Internet.');try{const {createWorker}=await import('tesseract.js');worker=await createWorker('eng');const result=await worker.recognize(sourceImage);const text=result.data.text.replace(/\s+/g,' ').trim().slice(0,35);if(!text)throw Error('Không nhận diện được chữ; bạn có thể nhập tên thủ công.');$('name').value=text;document.querySelector('[data-mode="text"]').click();status(`Đã đọc “${text}”. Hãy kiểm tra và sửa dấu tiếng Việt nếu cần.`)}catch(e){status(e.message)}finally{await worker?.terminate();$('ocr').disabled=false}};
$('fontfile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const buffer=await file.arrayBuffer();const parsed=opentype.parse(buffer);font=parsed;customFontBuffer=buffer;let option=$('font').querySelector('[value="custom"]');if(!option){option=new Option(file.name,'custom');$('font').add(option)}option.text=file.name;$('font').value='custom';fontRequest++;build()}catch(e){status(`Không đọc được font: ${e.message}`)}};
let defaultFont, fontRequest=0;
async function selectFont(id,{render=true}={}){
  const request=++fontRequest;
  try{if(!fallbackFont){const response=await fetch('/fonts/NotoSans-Bold.ttf');if(!response.ok)throw Error('Không tải được phông tiếng Việt dự phòng.');fallbackFont=opentype.parse(await response.arrayBuffer());fontCache.set('default',fallbackFont)}}catch(e){valid=false;$('exportstl').disabled=$('export3mf').disabled=true;status(e.message);return}if(request!==fontRequest)return;
  if(id==='custom'&&customFontBuffer){font=opentype.parse(customFontBuffer);if(render)build();return}
  const entry=FONT_CATALOG.find(f=>f.id===id)||FONT_CATALOG[0];
  status(`Đang tải font ${entry.label.split(' · ')[0]}…`);
  $('exportstl').disabled=$('export3mf').disabled=true;
  try{
    let selected=fontCache.get(entry.id);
    if(!selected){const response=await fetch(`/fonts/${entry.file}`);if(!response.ok)throw Error('Không tải được font.');selected=opentype.parse(await response.arrayBuffer());fontCache.set(entry.id,selected)}
    if(request!==fontRequest)return;
    font=selected;if(entry.id==='default')defaultFont=selected;
    $('font').value=entry.id;if(render)build();
  }catch(error){if(request===fontRequest){valid=false;status(error.message)}}
}
$('font').onchange=()=>{const id=$('font').value;filterFonts();selectFont(id);};
$('softPreset').onclick=async()=>{
  $('base').value='2.4';$('relief').value='2';$('baseRound').value='0.4';$('topRound').value='0.7';$('border').value='2.8';
  await selectFont('baloo');view();
};
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
const filename=()=>($('name').value.trim()||'keycraft').replace(/[^\p{L}\p{N}_-]/gu,'_');
$('exportstl').onclick=async()=>{if(!valid)return;build();if(!valid)return;const zip=new JSZip(),exporter=new STLExporter();for(const mesh of parts){const binary=exporter.parse(mesh,{binary:true});zip.file(`${mesh.name}.stl`,new Uint8Array(binary.buffer,binary.byteOffset,binary.byteLength))}zip.file('HUONG_DAN.txt','Đơn vị: mm. De.stl và Chu.stl dùng cùng hệ tọa độ.\nTrong Bambu Studio, chọn cả hai STL cùng lúc và xác nhận tải thành một đối tượng nhiều phần. Không tự sắp xếp từng phần. Gán filament cho De và Chu. Kiểm tra Slice và Preview trước khi in.\nĐế nằm tại Z=0; chữ bắt đầu ngay trên đế.');download(await zip.generateAsync({type:'blob'}),`${filename()}_STL.zip`,'application/zip')};
function meshXML(mesh,id){const g=mesh.geometry;const p=g.getAttribute('position');const index=g.index;const unique=[],map=new Map(),indices=[];for(let i=0;i<p.count;i++){const xyz=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Number(v.toFixed(5)));const key=xyz.join(',');if(!map.has(key)){map.set(key,unique.length);unique.push(xyz)}indices.push(map.get(key))}const triangles=[];for(let i=0;i<(index?index.count:p.count);i+=3){const tri=[0,1,2].map(j=>indices[index?index.getX(i+j):i+j]);if(new Set(tri).size===3)triangles.push(`<triangle v1="${tri[0]}" v2="${tri[1]}" v3="${tri[2]}"/>`)}return `<object id="${id}" type="model" name="${mesh.name}" pid="1" pindex="${id-2}"><mesh><vertices>${unique.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh></object>`}
$('export3mf').onclick=async()=>{if(!valid)return;build();if(!valid)return;try{download(await export3MF(parts),`${filename()}.3mf`,'model/3mf')}catch(e){status(e.message)}};
const settingIds=['name','width','base','relief','baseRound','topRound','border','hole','ring','side','threshold','basecolor','topcolor','rimHeight','rimWidth','bodyStyle'];
$('save').onclick=()=>{const settings=Object.fromEntries(settingIds.map(id=>[id,$(id).value]));download(JSON.stringify({version:2,mode,settings,invert:$('invert').checked,image:imageURL,customFont:customFontBuffer?Array.from(new Uint8Array(customFontBuffer)):null,fontChoice:$('font').value},null,2),`${filename()}.json`,'application/json')};
$('load').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>40*1024*1024)throw Error('Thiết kế vượt quá 40 MB.');const data=JSON.parse(await file.text());if(![1,2].includes(data.version)||!data.settings)throw Error('File thiết kế không hợp lệ.');for(const id of settingIds)if(data.settings[id]!==undefined)$(id).value=String(data.settings[id]);if(data.settings.rimHeight===undefined)$('rimHeight').value='0';if(data.settings.rimWidth===undefined)$('rimWidth').value='0.8';if(data.settings.baseRound===undefined)$('baseRound').value='0';if(data.settings.topRound===undefined)$('topRound').value='0';$('invert').checked=!!data.invert;if(data.customFont){customFontBuffer=new Uint8Array(data.customFont).buffer;const f=opentype.parse(customFontBuffer);if(!$('font').querySelector('[value="custom"]'))$('font').add(new Option('Font trong thiết kế','custom'));if(data.fontChoice==='custom'){fontRequest++;font=f;$('font').value='custom'}else{await selectFont(data.fontChoice||'default',{render:false})}}else{customFontBuffer=null;await selectFont(data.fontChoice||'default',{render:false})}if(data.image){if(!/^data:image\/(png|jpeg|webp);base64,/.test(data.image))throw Error('Định dạng ảnh trong thiết kế không hợp lệ.');await loadImage(data.image)}else{sourceImage=null;imageURL=null;$('reference').classList.add('hidden');$('ocr').classList.add('hidden')}document.querySelector(`[data-mode="${data.mode==='image'?'image':'text'}"]`).click()}catch(e){status(`Không mở được thiết kế: ${e.message}`)}};
selectFont('baloo').then(()=>view());


mountStudio('text');
window.addEventListener('keycraft:fit',()=>view());
