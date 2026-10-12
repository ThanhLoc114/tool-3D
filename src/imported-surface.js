import * as THREE from 'three';
import {mergeVertices,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
// Imported GLB/STL may contain one copy per triangle. Computing normals on
// those copies produces flat facets, even when the underlying surface is smooth.
export function smoothImportedSurface(source){
 const clean=new THREE.BufferGeometry();clean.setAttribute('position',source.getAttribute('position').clone());if(source.index)clean.setIndex(source.index.clone());
 const welded=mergeVertices(clean,1e-5);clean.dispose();welded.computeVertexNormals();
 const result=toCreasedNormals(welded,Math.PI/3);if(result!==welded)welded.dispose();return result;
}
