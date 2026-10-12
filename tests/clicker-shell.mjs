import assert from 'node:assert/strict';
import {analyzeImage} from '../src/image-processing.js';
import {buildClickerModel} from '../src/clicker-model.js';
const pixels=new Uint8ClampedArray(100*100*4);for(let y=10;y<90;y++)for(let x=10;x<90;x++)pixels.set([180,80,130,255],(y*100+x)*4);
const a=analyzeImage({pixels,width:100,height:100});
for(let switchCount=1;switchCount<=4;switchCount++){
 const r=buildClickerModel(a,{width:60,baseIndex:-1,switchCount});
 const structure=r.meshes.find(m=>m.name==='Nut_Ket_Cau_Lien_Khoi');
 assert.equal(structure.userData.switchCount,switchCount);
 assert.equal(structure.userData.skirtHeight,structure.userData.stemHeight);
 assert.equal(r.meshes.filter(m=>m.name.startsWith('Vo_')).length,1,'Shell is one boolean solid');
 for(const mesh of r.meshes){const p=mesh.geometry.getAttribute('position'),edges=new Map();for(let i=0;i<p.count;i+=3){const keys=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)].map(v=>v.toFixed(4)).join(','));if(new Set(keys).size!==3)continue;for(let j=0;j<3;j++){const key=[keys[j],keys[(j+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1)}}assert([...edges.values()].every(n=>n===2),mesh.name+' closed');mesh.geometry.dispose();mesh.material.dispose()}
 console.log('PASS matching shell, keyring, closed geometry and '+switchCount+' MX switches');
}
assert.throws(()=>buildClickerModel(a,{width:20,switchCount:4}),/chưa đủ rộng/);
const concavePixels=new Uint8ClampedArray(100*100*4);
for(let y=10;y<90;y++)for(let x=(y>30&&y<70?35:10);x<90;x++)concavePixels.set([180,80,130,255],(y*100+x)*4);
const concave=analyzeImage({pixels:concavePixels,width:100,height:100});
const repaired=buildClickerModel(concave,{width:70,baseIndex:-1,switchCount:1});
assert.equal(repaired.meshes.filter(m=>m.name.startsWith('Vo_')).length,1);
// fuseSolids also rejects more than one connected component: a detached ring
// cannot pass this regression even if it shares an STL object with the body.
for(const mesh of repaired.meshes){mesh.geometry.dispose();mesh.material.dispose()}
console.log('PASS concave silhouette: keyring attaches at actual contour and remains one connected solid');
