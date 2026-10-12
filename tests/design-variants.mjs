import assert from 'node:assert/strict';
import {analyzeImage} from '../src/image-processing.js';
import {buildImageModel} from '../src/image-model.js';
import {buildClickerModel} from '../src/clicker-model.js';
const pixels=new Uint8ClampedArray(100*100*4);for(let y=10;y<90;y++)for(let x=10;x<90;x++)pixels.set([180,80,130,255],(y*100+x)*4);const a=analyzeImage({pixels,width:100,height:100});
for(const baseShape of ['hexagon','capsule']){const r=buildImageModel(a,{width:70,baseIndex:-1,baseShape});assert.ok(r.meshes.length);for(const m of r.meshes){assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));m.geometry.dispose();m.material.dispose()}}
for(const [baseShape,switchCount,width]of [['capsule',2,90],['rounded',3,115],['rounded',4,110],['hexagon',1,65]]){const r=buildClickerModel(a,{width,baseShape,switchCount,baseIndex:-1});assert.equal(r.switchCount,switchCount);r.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()})}console.log('PASS new image shapes and clicker layouts');
