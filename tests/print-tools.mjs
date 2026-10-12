import assert from 'node:assert/strict';
import { buildCalibration,calculatePrintCost,spoolLength,bedFit } from '../src/print-tools.js';
import { export3MF } from '../src/model-export.js';
import JSZip from 'jszip';
assert.deepEqual(calculatePrintCost({mass:100,hours:2,pricePerKg:250000,watts:100,electricity:3000}),{material:25000,power:600,total:25600});
assert.ok(Math.abs(spoolLength(1000,1.75,1.24)-335.285)<.1);
assert.equal(bedFit(200,250,10,256,220,256).rotated,true);
assert.equal(bedFit(300,250,10).direct,false);
assert.throws(()=>calculatePrintCost({mass:-1,hours:2,pricePerKg:1,watts:1,electricity:1}));
for(const kind of ['tolerance','cube','wall']){const meshes=buildCalibration(kind);assert.equal(meshes.length,kind==='tolerance'?2:kind==='cube'?1:5);for(const m of meshes){for(const n of m.geometry.getAttribute('position').array)assert.ok(Number.isFinite(n))}const zip=await JSZip.loadAsync(await export3MF(meshes,{groups:meshes.map((_,i)=>[i])}));const xml=await zip.file('3D/3dmodel.model').async('string');assert.equal((xml.split('<build>')[1].match(/<item /g)||[]).length,meshes.length);meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()})}
console.log('PASS: cost, spool length, bed rotation, calibration models and separate export objects.');
