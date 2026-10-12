import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildLampModel} from '../src/lamp-model.js';
import {kernel} from '../src/fuse-solids.js';
import {export3MF,exportSTLs} from '../src/model-export.js';
import JSZip from 'jszip';
const g=new THREE.BoxGeometry(120,100,100);g.translate(0,0,50);
const settings={position:g.getAttribute('position').array,index:g.index.array,point:[0,0,100],normal:[0,0,1],depth:8,gap:.5};
for(const pose of [{point:[0,0,100],normal:[0,0,1]},{point:[60,0,50],normal:[1,0,0]}]){
 const r=buildLampModel({...settings,...pose});assert.equal(r.meshes.length,2);
 const origin=new THREE.Vector3(...pose.point).addScaledVector(new THREE.Vector3(...pose.normal),.5),direction=new THREE.Vector3(...pose.normal).negate();r.meshes[0].updateMatrixWorld();const floor=new THREE.Raycaster(origin,direction).intersectObject(r.meshes[0])[0];assert.ok(Math.abs(floor.distance-8.5)<.2,'Recess retains a floor at requested depth');
 for(const m of r.meshes){const input=new kernel.Mesh({numProp:3,vertProperties:Float32Array.from(m.geometry.attributes.position.array),triVerts:m.geometry.index?Uint32Array.from(m.geometry.index.array):Uint32Array.from({length:m.geometry.attributes.position.count},(_,i)=>i)});input.merge();const solid=new kernel.Manifold(input);assert.equal(solid.status(),'NoError');assert.ok(solid.volume()>0);const parts=solid.decompose();assert.equal(parts.length,1);parts.forEach(p=>p.delete());solid.delete()}
 const zip=await JSZip.loadAsync(await export3MF(r.meshes,{groups:[[0],[1]]}));const xml=await zip.file('3D/3dmodel.model').async('string');assert.equal((xml.split('<build>')[1].match(/<item /g)||[]).length,2);assert.ok((await exportSTLs(r.meshes)).length>1000);
 r.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});
}
assert.throws(()=>buildLampModel({...settings,point:[0,0,100],depth:30,normal:[0,0,-1]}),/mỏng/);
const sphere=new THREE.SphereGeometry(60,48,32);sphere.translate(0,0,60);const curved=buildLampModel({...settings,position:sphere.attributes.position.array,index:sphere.index.array,point:[0,0,120]});assert.equal(curved.meshes.length,2);curved.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});sphere.dispose();
assert.throws(()=>buildLampModel({...settings,gap:0}),/dung sai/);
g.dispose();console.log('PASS: closed LED pocket and lid, arbitrary surface orientation, clearance validation, separate STL/3MF.');
