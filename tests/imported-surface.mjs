import assert from 'node:assert/strict';
import * as THREE from 'three';
import {smoothImportedSurface} from '../src/imported-surface.js';
const indexed=new THREE.SphereGeometry(20,32,20),raw=indexed.toNonIndexed();
const out=smoothImportedSurface(raw),p=out.attributes.position,n=out.attributes.normal;
let alignment=0;for(let i=0;i<p.count;i++)alignment+=new THREE.Vector3().fromBufferAttribute(p,i).normalize().dot(new THREE.Vector3().fromBufferAttribute(n,i));assert(alignment/p.count>.995,'sphere normals are continuous');
assert.equal(p.count,raw.attributes.position.count);out.computeBoundingBox();raw.computeBoundingBox();assert(out.boundingBox.equals(raw.boundingBox),'smoothing normals preserves exact geometry');
const box=new THREE.BoxGeometry(10,10,10),sharp=smoothImportedSurface(box);for(let i=0;i<sharp.attributes.normal.count;i++){const v=new THREE.Vector3().fromBufferAttribute(sharp.attributes.normal,i);assert(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>.999,'preserve hard box corners')}
// Uneven marching-cubes triangles must contribute in proportion to their area.
const uneven=new THREE.BufferGeometry();uneven.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,4,0,0,0,4,0,0,0,0,0,1,0,-1,0,1],3));
const weighted=smoothImportedSurface(uneven),actual=new THREE.Vector3().fromBufferAttribute(weighted.attributes.normal,0),expected=new THREE.Vector3(1,0,17).normalize();
assert(actual.dot(expected)>.999999,'small triangles cannot dominate smooth surface normals');
console.log('PASS imported surface normals: smooth curves, preserve geometry and sharp edges');
