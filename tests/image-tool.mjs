import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import JSZip from 'jszip';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { analyzeImage, traceMask } from '../src/image-processing.js';
import { buildImageModel, cleanArtwork } from '../src/image-model.js';
import ClipperLib from 'clipper-lib';
import { export3MF, exportSTLs } from '../src/model-export.js';
import { buildClickerModel } from '../src/clicker-model.js';

const rect=(x,y,w,h)=>[{X:x,Y:y},{X:x+w,Y:y},{X:x+w,Y:y+h},{X:x,Y:y+h}];
const noisy=cleanArtwork([rect(0,0,10000,10000),rect(14000,0,200,3000),rect(16000,0,500,500),rect(2000,2000,200,200).reverse(),rect(5000,5000,2000,2000).reverse()]);
const cleanedRegions=ClipperLib.JS.PolyTreeToExPolygons(noisy);
assert.equal(cleanedRegions.length,1,'Remove thin highlights and small isolated specks');
assert.equal(cleanedRegions[0].holes.length,1,'Fill texture pinholes but retain real artwork counters');

function closed(geometry){
  const p=geometry.getAttribute('position'),edges=new Map();let volume=0;
  for(let i=0;i<p.count;i+=3){
    const vs=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j));
    volume+=vs[0].dot(vs[1].clone().cross(vs[2]))/6;
    const keys=vs.map(v=>[v.x,v.y,v.z].map(x=>x.toFixed(4)).join(','));
    if(new Set(keys).size<3)continue;
    for(let j=0;j<3;j++){const key=[keys[j],keys[(j+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1)}
  }
  const bad=[...edges].filter(([_,count])=>count!==2);
  assert.equal(bad.length,0,`Closed surface: ${JSON.stringify(bad.slice(0,8))}`);assert(volume>0,'Outward winding / positive volume');
}
const w=100,h=80,pixels=new Uint8ClampedArray(w*h*4);
for(let y=12;y<68;y++)for(let x=12;x<88;x++){
  const color=x<48?[140,70,30,255]:[245,224,193,255];
  pixels.set(color,(y*w+x)*4);
}
const analysis=analyzeImage({pixels,width:w,height:h,colorCount:2});
assert(analysis.usesAlpha);assert.equal(analysis.palette.length,2);assert(analysis.layerPaths.every(p=>p.length));
const result=buildImageModel(analysis,{baseIndex:-1,width:70,base:2.4,round:.3,side:'left',depths:[1.2,2]});
assert.equal(result.meshes.length,3);
for(const m of result.meshes)closed(m.geometry);
assert(Math.abs(result.size.z-4.4)<1e-5);
const zip3=await JSZip.loadAsync(await export3MF(result.meshes));
const xml=await zip3.file('3D/3dmodel.model').async('string');
assert.equal((xml.match(/<object /g)||[]).length,4);assert.equal((xml.match(/<component /g)||[]).length,3);assert(xml.includes('<item objectid="5"'));assert(!/NaN|Infinity/.test(xml));
const stls=await JSZip.loadAsync(await exportSTLs(result.meshes));
for(const name of Object.keys(stls.files).filter(n=>n.endsWith('.stl'))){const buffer=await stls.file(name).async('arraybuffer');closed(new STLLoader().parse(buffer))}
console.log('PASS transparent logo, multiple raised colors, layer heights, 3MF and STL round trip');

const donut=new Uint8Array(w*h);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const radius=Math.hypot(x-50,y-40);donut[y*w+x]=radius<30&&radius>12?1:0}
const paths=traceMask(donut,w,h);assert.equal(paths.length,2);
const blank=new Uint8ClampedArray(60*60*4);blank.fill(255);
assert.throws(()=>analyzeImage({pixels:blank,width:60,height:60}),/Chưa tìm/);
console.log('PASS contour holes and empty-image failure');

const striped=new Uint8ClampedArray(120*100*4),stripeColors=[[220,25,40],[15,130,230],[30,160,45],[245,190,30],[140,45,190]];
for(let y=15;y<85;y++)for(let x=10;x<110;x++)striped.set([...stripeColors[Math.floor((x-10)/20)],255],(y*120+x)*4);
const five=analyzeImage({pixels:striped,width:120,height:100,colorCount:5,minArea:4});
assert.equal(five.palette.length,5);
const fiveModel=buildImageModel(five,{baseIndex:-1,side:'top',round:.4});
assert.equal(fiveModel.meshes.length,6);for(const m of fiveModel.meshes)closed(m.geometry);
for(const m of fiveModel.meshes){m.geometry.dispose();m.material.dispose()}
console.log('PASS five image colors, added backing plate and top keyring');

const png=PNG.sync.read(fs.readFileSync('public/examples/coffee.png'));
const side=720,factor=side/Math.max(png.width,png.height),cw=Math.round(png.width*factor),ch=Math.round(png.height*factor),coffee=new Uint8ClampedArray(cw*ch*4);
for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const source=(Math.min(png.height-1,Math.floor(y/factor))*png.width+Math.min(png.width-1,Math.floor(x/factor)))*4;coffee.set(png.data.subarray(source,source+4),(y*cw+x)*4)}
const coffeeAnalysis=analyzeImage({pixels:coffee,width:cw,height:ch,colorCount:2,tolerance:42,minArea:8});
assert.equal(coffeeAnalysis.palette.length,2);assert(coffeeAnalysis.foregroundPixels<coffee.length/4*.65,'Photo background removed');
const coffeeModel=buildImageModel(coffeeAnalysis,{width:85,base:2.4,round:.7,smooth:.5,side:'auto'});
for(const m of coffeeModel.meshes)closed(m.geometry);
console.log('PASS supplied coffee image',JSON.stringify({colors:coffeeAnalysis.palette,hole:coffeeModel.detectedHole,size:coffeeModel.size,parts:coffeeModel.meshes.length}));
const editableSettings={width:85,base:2.4,round:.7,smooth:.5,side:'auto',editableParts:true};
const editable=buildImageModel(coffeeAnalysis,editableSettings);
const target=editable.meshes.find(m=>m.userData.deleteMark);
assert(target,'Artwork can be selected separately');
const deletedMarks=[target.userData.deleteMark];
const removed=buildImageModel(coffeeAnalysis,{...editableSettings,deletedMarks});
assert.equal(removed.meshes.length,editable.meshes.length-1,'Delete exactly one selected connected region');
const resized=buildImageModel(coffeeAnalysis,{...editableSettings,width:100,deletedMarks});
const resizedFull=buildImageModel(coffeeAnalysis,{...editableSettings,width:100});
assert.equal(resized.meshes.length,resizedFull.meshes.length-1,'Deletion persists after resizing');
const archive=await JSZip.loadAsync(await exportSTLs(removed.meshes));
assert.equal(Object.keys(archive.files).filter(n=>n.endsWith('.stl')).length,removed.meshes.length,'Distinct filenames preserve all surviving parts');
for(const result of [editable,removed,resized,resizedFull])for(const mesh of result.meshes){mesh.geometry.dispose();mesh.material.dispose()}
console.log('PASS pickable artwork, deletion, resize persistence and edited STL export');
const clicker=buildClickerModel(coffeeAnalysis,{width:60,base:2.4,round:.7,smooth:.5,mxSlot:14.1,mxClearance:.15});
for(const mesh of clicker.meshes)closed(mesh.geometry);
assert(clicker.meshes.some(m=>m.name==='Nut_Ket_Cau_Lien_Khoi'));
assert(clicker.meshes.some(m=>m.name==='Vo_Lien_Khoi'));
fs.writeFileSync('artifacts/coffee-clicker-test.3mf',await export3MF(clicker.meshes));
for(const mesh of clicker.meshes){mesh.geometry.dispose();mesh.material.dispose()}
console.log('PASS MX clicker socket, housing and image cap closed surfaces');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/coffee-image-test.3mf',await export3MF(coffeeModel.meshes));
for(const m of [...coffeeModel.meshes,...result.meshes]){m.geometry.dispose();m.material.dispose()}
