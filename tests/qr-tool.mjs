import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { buildQRModel } from '../src/qr-model.js';
import { export3MF, exportSTLs } from '../src/model-export.js';
const text='https://example.com/ca-phe?ban=12';
const settings={width:40,margin:5,base:2.4,relief:.6,frameHeight:.6,baseColor:'#ae8bd5',frameColor:'#7653aa',lightColor:'#ffffff',darkColor:'#151515',hole:true};
for(const shape of ['rounded','circle','hexagon','ticket','flower','tag'])for(const frame of ['none','thin','bold','double']){
 const {meshes,qr}=buildQRModel(text,{...settings,shape,frame});
 assert.equal(meshes.length,frame==='none'?3:4);
 for(const mesh of meshes){const p=mesh.geometry.getAttribute('position');assert.ok(p.count>0);for(const v of p.array)assert.ok(Number.isFinite(v));}
 const n=qr.modules.size,unit=8,size=(n+8)*unit,data=new Uint8ClampedArray(size*size*4).fill(255);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.modules.get(y,x))for(let yy=0;yy<unit;yy++)for(let xx=0;xx<unit;xx++){const i=(((y+4)*unit+yy)*size+(x+4)*unit+xx)*4;data[i]=data[i+1]=data[i+2]=0;}
 assert.equal(jsQR(data,size,size)?.data,text);
 if(shape==='rounded'&&frame==='thin'){assert.ok((await export3MF(meshes)).length>100);assert.ok((await exportSTLs(meshes)).length>100);}
 meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});
}
assert.throws(()=>buildQRModel('',settings));
console.log('PASS: 24 base/frame combinations, QR decode roundtrip, STL and 3MF exports.');
import { wifiPayload } from '../src/qr-content.js';
import * as THREE from 'three';
assert.equal(wifiPayload('Cafe; A','a:b\\c'),String.raw`WIFI:T:WPA;S:Cafe\; A;P:a\:b\\c;H:false;;`);
assert.equal(wifiPayload('Free','ignored','nopass',true),'WIFI:T:nopass;S:Free;H:true;;');
assert.throws(()=>wifiPayload('',''));
for(const shape of ['rounded','circle','hexagon','ticket','flower','tag'])for(const mounting of ['flat','stand','keychain']){
 const result=buildQRModel(wifiPayload('Cafe','12345678'),{...settings,shape,mounting,standDepth:32});
 assert.equal(result.meshes.some(m=>m.name==='Be_Dung_QR'),mounting==='stand');
 if(mounting==='stand'){
  const stand=result.meshes.find(m=>m.name==='Be_Dung_QR');stand.geometry.computeBoundingBox();assert.equal(stand.geometry.boundingBox.min.z,0);assert.equal(stand.geometry.boundingBox.max.z,8);
  const edges=new Map(),p=stand.geometry.getAttribute('position');
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(4)).join(',');
  for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++){const a=key(i+j),b=key(i+(j+1)%3),k=[a,b].sort().join('|');edges.set(k,(edges.get(k)||0)+1)}
  assert.ok([...edges.values()].every(n=>n===2),'Stand must be watertight');
  assert.ok((await export3MF(result.meshes)).length>100);
 }
 result.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});
}
console.log('PASS: Wi-Fi escaping and 18 mounting/silhouette combinations; watertight stand exports.');
import JSZip from 'jszip';
const split=buildQRModel('https://example.com',{...settings,shape:'rounded',mounting:'stand'});
assert.equal(split.joint.slotWidth-split.joint.tongueWidth,.5);
assert.ok(Math.abs(split.joint.slotThickness-split.joint.tongueThickness-.5)<1e-8);
assert.equal(split.joint.slotDepth,split.joint.insertionDepth);
const standIndex=split.meshes.findIndex(m=>m.name==='Be_Dung_QR');
const groups=[split.meshes.map((_,i)=>i).filter(i=>i!==standIndex),[standIndex]];
const splitZip=await JSZip.loadAsync(await export3MF(split.meshes,{groups}));
const splitXML=await splitZip.file('3D/3dmodel.model').async('string');
assert.equal((splitXML.split('<build>')[1].match(/<item /g)||[]).length,2);
split.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});
console.log('PASS: tongue/slot clearances and separate 3MF build objects.');
