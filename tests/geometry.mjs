import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import opentype from 'opentype.js';
import ClipperLib from 'clipper-lib';
import { mergeVertices, mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
const code=fs.readFileSync('src/main.js','utf8');
const fontBuffer=fs.readFileSync('public/fonts/NotoSans-Bold.ttf');
const font=opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset,fontBuffer.byteOffset+fontBuffer.byteLength));
const values={bodyStyle:'contour',rimHeight:1.2,rimWidth:.8,name:'DUYEN',width:75,base:2.4,relief:1.2,baseRound:.4,topRound:.5,border:2.4,hole:4,ring:2.4,side:'left',threshold:150,basecolor:'#b38add',topcolor:'#fff9ef'};
const els={};for(const [id,value] of Object.entries(values))els[id]={value:String(value),min:'0',max:'1000'};
const $=id=>els[id]??(els[id]={});
let message='';
const setup=code.slice(code.indexOf('const SCALE'),code.indexOf('let mode='));
const functions=code.slice(code.indexOf('function number('),code.indexOf('let timer;'));
const xmlFunction=code.slice(code.indexOf('function meshXML('),code.indexOf("$('export3mf').onclick"));
const make=new Function('THREE','opentype','ClipperLib','font','$','status','mergeVertices','mergeGeometries','toCreasedNormals',`${setup}\nfallbackFont=font;let mode='text',valid=false,parts=[],sourceImage={naturalWidth:240,naturalHeight:240};const model=new THREE.Group();const syncParameterControls=()=>{};const invalidate=()=>{};${functions}\n${xmlFunction}\nreturn {build,model,get valid(){return valid},get parts(){return parts},setMode(v){mode=v},setFont(v){font=v},getXml(){return parts.map((p,i)=>meshXML(p,i+2)).join('')}}`);
const app=make(THREE,opentype,ClipperLib,font,$,s=>message=s,mergeVertices,mergeGeometries,toCreasedNormals);
function verifyClosed(mesh){const p=mesh.geometry.getAttribute('position'),edges=new Map();let volume=0;for(let i=0;i<p.count;i+=3){const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j));volume+=vertices[0].dot(vertices[1].clone().cross(vertices[2]))/6;const keys=vertices.map(v=>[v.x,v.y,v.z].map(x=>x.toFixed(4)).join(','));if(new Set(keys).size<3)continue;for(let j=0;j<3;j++){const edge=[keys[j],keys[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1)}}assert(volume>0,`${mesh.name}: outward winding / volume`);const bad=[...edges.entries()].filter(([key,n])=>n!==2);assert.equal(bad.length,0,`${mesh.name}: watertight mesh ${JSON.stringify(bad.slice(0,12))}`)}
for(const text of ((process.env.GEOMETRY_FONT||process.env.GEOMETRY_EXPORT_ONLY)?[]:['Oanh Nguyễn','N.Khang','DUYEN','DUYÊN','BẢO','i j','O']))for(const side of ['left','top','none']){$('name').value=text;$('side').value=side;app.build();assert(app.valid,`${text}/${side}: ${message}`);assert.equal(app.parts.length,2);for(const p of app.parts)verifyClosed(p);const box=new THREE.Box3().setFromObject(app.model);assert.equal(box.min.z,0);assert(Math.abs(box.max.z-3.6)<.001);const xml=app.getXml();assert(!/NaN|Infinity/.test(xml));assert(xml.includes('<triangle'));console.log(`PASS ${text} / ${side}`)}
$('name').value='';app.build();assert(!app.valid);assert.ok(app.model.children.length>0,'Keep last preview when text is invalid');assert($('export3mf').disabled);
console.log('PASS invalid input blocks exports');
const pixels=new Uint8ClampedArray(240*240*4);
for(let y=0;y<240;y++)for(let x=0;x<240;x++){const r=Math.hypot(x-120,y-120);pixels.set(r<90&&r>35?[0,0,0,255]:[255,255,255,255],(y*240+x)*4)}
globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};
$('mask').getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}});
$('invert').checked=false;
app.setMode('image');app.build();assert(app.valid,message);for(const p of app.parts)verifyClosed(p);
assert(app.parts[1].geometry.parameters.shapes.some(s=>s.holes.length>0),'Image counter stays open in raised detail');
console.log('PASS image silhouette with hole');
app.setMode('text');$('side').value='left';
for(const filename of ['Baloo2','Fredoka','Nunito','Quicksand','LilitaOne'].filter(f=>!process.env.GEOMETRY_FONT||f===process.env.GEOMETRY_FONT)){
  const data=fs.readFileSync(`public/fonts/${filename}.ttf`);
  app.setFont(opentype.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)));
  for(const [text,base,relief,baseRound,topRound] of [
    ['DUYEN',2.4,2,.4,.7],
    [filename==='LilitaOne'?'BOO':'DUYÊN',1,.4,1.2,1.5],
    ['Oanh Nguyễn',2.4,2,.4,.7],['B8',4,3,0,0]
  ]){
    if(process.env.GEOMETRY_TEXT&&text!==process.env.GEOMETRY_TEXT)continue;
    for(const [id,value] of Object.entries({name:text,base,relief,baseRound,topRound}))$(id).value=String(value);
    app.build();assert(app.valid,`${filename}: ${message}`);
    for(const mesh of app.parts)verifyClosed(mesh);
    const baseBox=new THREE.Box3().setFromObject(app.parts[0]);
    const topBox=new THREE.Box3().setFromObject(app.parts[1]);
    assert.equal(baseBox.min.z,0);
    assert(Math.abs(baseBox.max.z-base)<1e-5);
    assert(Math.abs(topBox.min.z-base)<1e-5);
    assert(Math.abs(topBox.max.z-base-Math.max(relief,Number($('rimHeight').value)))<1e-5);
    for(const mesh of app.parts){
      const binary=new STLExporter().parse(mesh,{binary:true});
      const restored=new THREE.Mesh(new STLLoader().parse(binary.buffer));
      verifyClosed(restored);
      assert(new THREE.Box3().setFromObject(restored).equals(new THREE.Box3().setFromObject(mesh)));
      restored.geometry.dispose();restored.material.dispose();
    }
    if(topRound===0)assert.equal(app.parts[1].geometry.userData.actualRadius,0);
    console.log(`PASS ${filename} / ${text} / layers ${base}+${relief}`);
    if(filename==='Baloo2'&&text==='DUYEN'){
      const finalCount=app.parts[1].geometry.getAttribute('position').count;
      const previewStart=performance.now();app.build(true);const previewMs=performance.now()-previewStart;assert(app.valid,message);
      for(const mesh of app.parts)verifyClosed(mesh);
      const previewBox=new THREE.Box3().setFromObject(app.model);
      assert(Math.abs(previewBox.max.z-base-relief)<1e-5);
      assert(app.parts[1].geometry.getAttribute('position').count<finalCount);
      app.build(false);assert.equal(app.parts[1].geometry.getAttribute('position').count,finalCount);
      console.log(`PASS lightweight live preview returns to final quality (${previewMs.toFixed(0)} ms preview build)`);
    }
  }
}
