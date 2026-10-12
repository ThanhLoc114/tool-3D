import * as THREE from 'three';
import ManifoldModule from 'manifold-3d';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
export const kernel=await ManifoldModule({locateFile:()=>new URL('../node_modules/manifold-3d/manifold.wasm',import.meta.url).href});
kernel.setup();
export function fuseSolids(meshes,name){
  const solids=[];let union;
  try{
    for(const mesh of meshes){
      const geometry=mesh.geometry,p=geometry.getAttribute('position'),index=geometry.index;
      const input=new kernel.Mesh({numProp:3,vertProperties:Float32Array.from(p.array),triVerts:index?Uint32Array.from(index.array):Uint32Array.from({length:p.count},(_,i)=>i)});
      input.merge();solids.push(new kernel.Manifold(input));
    }
    union=kernel.Manifold.union(solids);
    const components=union.decompose(),componentCount=components.length;
    for(const component of components)component.delete();
    if(componentCount!==1)throw Error(`${name}: kết cấu còn ${componentCount} phần rời. Hãy tăng kích thước hoặc viền đế.`);
    const output=union.getMesh(),geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(output.vertProperties,3));geometry.setIndex(new THREE.BufferAttribute(output.triVerts,1));
    const raw=geometry.toNonIndexed();geometry.dispose();raw.computeVertexNormals();
    const result=new THREE.Mesh(toCreasedNormals(raw,Math.PI/3),meshes[0].material.clone());
    result.name=name;result.castShadow=result.receiveShadow=true;
    return result;
  }finally{union?.delete();for(const solid of solids)solid.delete()}
}
