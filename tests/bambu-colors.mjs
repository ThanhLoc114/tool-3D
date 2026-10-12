import assert from 'node:assert/strict';
import * as THREE from 'three';
import JSZip from 'jszip';
import {export3MF} from '../src/model-export.js';
const meshes=['#82b7ce','#fff8e8','#fff8e8'].map((color,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(10,10,2),new THREE.MeshStandardMaterial({color}));m.name=['De','Chu & Vien','Chi_tiet'][i];return m});
const zip=await JSZip.loadAsync(await export3MF(meshes,{groups:[[0,1],[2]]}));
const cfg=JSON.parse(await zip.file('Metadata/project_settings.config').async('string'));assert.deepEqual(cfg.filament_colour,['#82B7CE','#FFF8E8']);
const settings=await zip.file('Metadata/model_settings.config').async('string');assert.match(settings,/<part id="2" subtype="normal_part">.*?key="extruder" value="1"/);assert.match(settings,/<part id="3" subtype="normal_part">.*?key="extruder" value="2"/);assert.match(settings,/<part id="4" subtype="normal_part">.*?key="extruder" value="2"/);assert.match(settings,/Chu &amp; Vien/);assert.match(settings,/<object id="5">/);assert.match(settings,/<object id="6">/);
const model=await zip.file('3D/3dmodel.model').async('string');assert.equal((model.match(/<item /g)||[]).length,2);console.log('PASS 3MF filament colors, part assignments, deduplication, assemblies, escaping');
