import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import JSZip from 'jszip';
import { buildBabyModel } from '../src/baby-model.js';
import { export3MF,exportSTLs } from '../src/model-export.js';
const buffer=fs.readFileSync('public/fonts/NotoSans-Bold.ttf');const font=opentype.parse(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
const s={name:'BÉ MINH AN',date:'12.06.2026',time:'08:15',weight:'3,2',length:'50',width:180,base:3,relief:.6,textDepth:.8,mounting:'stand',standDepth:55,creamColor:'#fff0d5',outlineColor:'#80502d',accentColor:'#89b4da',bearColor:'#d5a16b',textColor:'#80502d'};
for(const width of [120,180,220]){const r=buildBabyModel(font,{...s,width});assert.ok(r.meshes.some(m=>m.name==='Ten_Be'));assert.ok(r.meshes.some(m=>m.name==='Be_Dung_QR'));for(const m of r.meshes)for(const v of m.geometry.getAttribute('position').array)assert.ok(Number.isFinite(v));if(width===180){const idx=r.meshes.findIndex(m=>m.name==='Be_Dung_QR');const out=await export3MF(r.meshes,{groups:[r.meshes.map((_,i)=>i).filter(i=>i!==idx),[idx]]});const zip=await JSZip.loadAsync(out);const xml=await zip.file('3D/3dmodel.model').async('string');assert.equal((xml.split('<build>')[1].match(/<item /g)||[]).length,2);assert.ok((await exportSTLs(r.meshes)).length>1000);fs.writeFileSync('artifacts/baby-keepsake-test.3mf',out)}r.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()})}
assert.throws(()=>buildBabyModel(font,{...s,name:''}));console.log('PASS: Vietnamese text, 3 sizes, separate pedestal, STL/3MF exports.');
import { filterBabyArtwork } from '../src/baby-model.js';
import ClipperLib from 'clipper-lib';
const square=(x,y,w,h)=>[{X:x*1000,Y:y*1000},{X:(x+w)*1000,Y:y*1000},{X:(x+w)*1000,Y:(y+h)*1000},{X:x*1000,Y:(y+h)*1000}];
const filtered=filterBabyArtwork([square(0,0,2,2),square(5,0,.1,.1),square(8,0,.1,4),square(10,0,.7,.7)]);
assert.equal(ClipperLib.JS.PolyTreeToExPolygons((await import('../src/solid-geometry.js')).boolean(filtered)).length,2,'Remove specks and strips, keep face-sized details');
console.log('PASS: artwork speck and thin-strip regression.');

const fredokaBuffer=fs.readFileSync("public/fonts/Fredoka.ttf");const fredoka=opentype.parse(fredokaBuffer.buffer.slice(fredokaBuffer.byteOffset,fredokaBuffer.byteOffset+fredokaBuffer.byteLength));const {textOutline}=await import("../src/baby-model.js");assert.ok(textOutline(fredoka,"Giờ sinh",0,0,43,4,font).length);console.log("PASS: Vietnamese fallback in decorative fonts.");
