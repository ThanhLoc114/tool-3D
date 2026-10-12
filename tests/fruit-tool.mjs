import assert from 'node:assert/strict';
import {buildFruitModel} from '../src/fruit-model.js';
import {kernel} from '../src/fuse-solids.js';
import {export3MF} from '../src/model-export.js';
import JSZip from 'jszip';
for(const [width,fruitStyle] of [[46,'classic'],[52,'round'],[80,'long']]){const result=buildFruitModel({width,seeds:8,fruitStyle});assert.equal(result.meshes.length,4);const solids=[];try{for(const m of result.meshes){const p=m.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite));const input=new kernel.Mesh({numProp:3,vertProperties:p.array,triVerts:Uint32Array.from({length:p.count},(_,i)=>i)});input.merge();const s=new kernel.Manifold(input);solids.push(s);assert.equal(s.status(),'NoError');assert.ok(s.volume()>0)}for(const ids of [[0,1],[2,3]]){const joined=kernel.Manifold.union(ids.map(i=>solids[i]));const components=joined.decompose();assert.equal(components.filter(c=>c.volume()>1e-4).length,1,'Each printable assembly must be connected');components.forEach(c=>c.delete());joined.delete()}const zip=await JSZip.loadAsync(await export3MF(result.meshes,{groups:[[0,1],[2,3]]}));const xml=await zip.file('3D/3dmodel.model').async('string');assert.equal((xml.match(/<item /g)||[]).length,2)}finally{solids.forEach(s=>s.delete());result.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()})}}
assert.throws(()=>buildFruitModel({width:20}));console.log('Fruit clicker: closed solids, connected assemblies, sizes and 3MF passed.');

