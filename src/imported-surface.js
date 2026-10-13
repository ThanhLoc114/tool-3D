import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
// Imported GLB/STL may contain one copy per triangle. Computing normals on
// those copies produces flat facets, even when the underlying surface is smooth.
export function smoothImportedSurface(source,organic=false){
 const clean=new THREE.BufferGeometry();clean.setAttribute('position',source.getAttribute('position').clone());if(source.index)clean.setIndex(source.index.clone());
 const welded=mergeVertices(clean,Math.min(1e-5,new THREE.Box3().setFromBufferAttribute(clean.attributes.position).getSize(new THREE.Vector3()).length()*1e-7)||1e-8);clean.dispose();welded.computeVertexNormals();
 // Organic AI surfaces have no designed hard seams. A crease threshold can
 // alternate at noisy concave junctions and exaggerate tiny teeth in the mesh.
 if(organic){const result=welded.toNonIndexed();welded.dispose();return result;}
 // Weight by triangle area: marching-cubes surfaces have very uneven triangle
 // sizes. Equal weighting creates visible bands even on a continuous surface.
 const pos=welded.attributes.position,indices=welded.index.array;
 const adjacent=Array.from({length:pos.count},()=>[]),faces=[];
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(pos,indices[i]);b.fromBufferAttribute(pos,indices[i+1]);c.fromBufferAttribute(pos,indices[i+2]);const cross=b.sub(a).cross(c.sub(a));faces.push(cross.clone());for(let j=0;j<3;j++)adjacent[indices[i+j]].push(i/3);}
 const result=welded.toNonIndexed(),normals=new Float32Array(indices.length*3),sum=new THREE.Vector3();
 for(let i=0;i<indices.length;i++){const face=faces[Math.floor(i/3)],length=face.length();sum.set(0,0,0);for(const f of adjacent[indices[i]]){const other=faces[f];if(!length||face.dot(other)>=.5*length*other.length())sum.add(other);}sum.normalize();normals[i*3]=sum.x;normals[i*3+1]=sum.y;normals[i*3+2]=sum.z;}
 result.setAttribute('normal',new THREE.BufferAttribute(normals,3));welded.dispose();return result;
}

export function softenGeometry(source,iterations=0,organic=false){
 const clean=new THREE.BufferGeometry();clean.setAttribute('position',source.attributes.position.clone());if(source.index)clean.setIndex(source.index.clone());
 const g=mergeVertices(clean,Math.min(1e-5,new THREE.Box3().setFromBufferAttribute(clean.attributes.position).getSize(new THREE.Vector3()).length()*1e-7)||1e-8);clean.dispose();const p=g.attributes.position,edges=Array.from({length:p.count},()=>new Set()),idx=g.index.array;
 for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){const a=idx[i+j],b=idx[i+(j+1)%3];edges[a].add(b);edges[b].add(a)}
 const next=new Float32Array(p.array.length),before=new THREE.Box3().setFromBufferAttribute(p),size=before.getSize(new THREE.Vector3());
 for(let pass=0;pass<Math.max(0,Math.min(40,Math.round(iterations)))*2;pass++){const rate=pass%2?-.53:.5;for(let i=0;i<p.count;i++){const neighbors=edges[i];for(let axis=0;axis<3;axis++){let sum=0;for(const j of neighbors)sum+=p.array[j*3+axis];const value=p.array[i*3+axis];next[i*3+axis]=neighbors.size?value+rate*(sum/neighbors.size-value):value}}p.array.set(next)}
 // Keep the physical dimensions and placement of the original object.
 const after=new THREE.Box3().setFromBufferAttribute(p),outSize=after.getSize(new THREE.Vector3());for(let i=0;i<p.count;i++)for(let a=0;a<3;a++){const keys=['x','y','z'],key=keys[a];p.array[i*3+a]=outSize[key]>0?before.min[key]+(p.array[i*3+a]-after.min[key])*size[key]/outSize[key]:p.array[i*3+a]}
 const result=smoothImportedSurface(g,organic);g.dispose();return result;
}
export function buildSoftenedModel(settings){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(settings.position),3));if(settings.index)g.setIndex(new THREE.BufferAttribute(Uint32Array.from(settings.index),1));const out=softenGeometry(g,settings.iterations,settings.organic===true);g.dispose();return {meshes:[new THREE.Mesh(out,new THREE.MeshStandardMaterial({color:'#c2acd9',roughness:.6}))]}}
