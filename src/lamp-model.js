import * as THREE from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {kernel} from './fuse-solids.js';
export function normalizeLampGeometry(geometry,width){
 const g=geometry.clone();g.computeBoundingBox();const b=g.boundingBox,size=b.getSize(new THREE.Vector3());
 if(!Number.isFinite(width)||width<70||width>250||size.x<=0)throw Error('Chiều rộng phải từ 70–250 mm.');
 g.translate(-(b.min.x+b.max.x)/2,-(b.min.y+b.max.y)/2,-b.min.z);g.scale(width/size.x,width/size.x,width/size.x);g.computeVertexNormals();return g;
}
export function buildLampModel(s){
 const depth=Number(s.depth),gap=Number(s.gap),diameter=59;
 if(!Number.isFinite(depth)||depth<4||depth>30||!Number.isFinite(gap)||gap<.15||gap>1)throw Error('Kiểm tra độ sâu hốc và dung sai.');
 const point=new THREE.Vector3(...s.point),normal=new THREE.Vector3(...s.normal);
 if(![...s.point,...s.normal].every(Number.isFinite)||normal.length()<.9)throw Error('Chọn vị trí trên bề mặt trước.');normal.normalize();
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal),matrix=new THREE.Matrix4().compose(point,q,new THREE.Vector3(1,1,1));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(s.position,3));if(s.index)geometry.setIndex(new THREE.BufferAttribute(s.index,1));
 const source=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));source.updateMatrixWorld();
 const ray=new THREE.Raycaster(point.clone().addScaledVector(normal,-.05),normal.clone().negate());const exit=ray.intersectObject(source)[0];
 if(!exit||exit.distance<depth+1.2){source.material.dispose();geometry.dispose();throw Error('Vị trí này quá mỏng. Chọn vùng dày hơn hoặc giảm độ sâu; cần giữ đáy ít nhất 1,2 mm.');}
 // Curved surfaces need an adapter that reaches the original material around
 // the entire seat. A thin planar collar would detach after cutting its centre.
 let supportDepth=3;
 for(let i=0;i<24;i++){const a=i*Math.PI/12,local=new THREE.Vector3(Math.cos(a)*(29.5+gap/2+1),Math.sin(a)*(29.5+gap/2+1),.5).applyMatrix4(matrix);const probe=new THREE.Raycaster(local,normal.clone().negate()).intersectObject(source)[0];if(!probe||probe.distance>exit.distance-1.2){source.material.dispose();geometry.dispose();throw Error('Vùng này chưa đủ rộng để giữ hốc Ø59 mm. Chọn vùng rộng hơn hoặc tăng kích thước mô hình.');}supportDepth=Math.max(supportDepth,probe.distance+.8)}
 source.material.dispose();
 const owned=[];const convert=g=>{const p=g.getAttribute('position'),idx=g.index;const input=new kernel.Mesh({numProp:3,vertProperties:Float32Array.from(p.array),triVerts:idx?Uint32Array.from(idx.array):Uint32Array.from({length:p.count},(_,i)=>i)});input.merge();const solid=new kernel.Manifold(input);owned.push(solid);g.dispose();if(String(solid.status())!=='NoError')throw Error('Mô hình chưa kín hoặc có lỗi mesh. Sửa mesh trong slicer rồi nhập lại.');return solid};
 const cylinder=(r,h,z,world=true)=>{const g=new THREE.CylinderGeometry(r,r,h,96);g.rotateX(Math.PI/2);g.translate(0,0,z);if(world)g.applyMatrix4(matrix);return convert(g)};
 const box=(w,h,d,x,z,world=true)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,0,z);if(world)g.applyMatrix4(matrix);return convert(g)};
 const remember=v=>{owned.push(v);return v};
 const makeMesh=(solid,name,color)=>{if(solid.isEmpty())throw Error('Hốc không giao với mô hình.');const parts=solid.decompose();const count=parts.length;parts.forEach(p=>p.delete());if(count!==1)throw Error('Kết cấu bị chia thành nhiều mảnh; chọn vị trí khác.');const m=solid.getMesh(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(m.vertProperties,3));g.setIndex(new THREE.BufferAttribute(m.triVerts,1));const raw=g.toNonIndexed();g.dispose();raw.computeVertexNormals();const smooth=toCreasedNormals(raw,Math.PI/3);if(smooth!==raw)raw.dispose();const mesh=new THREE.Mesh(smooth,new THREE.MeshStandardMaterial({color,roughness:.6}));mesh.name=name;return mesh};
 try{
  const r=diameter/2+gap/2,main=convert(geometry),collar=cylinder(r+4,supportDepth,-supportDepth/2);
  const supported=remember(kernel.Manifold.union([main,collar]));
  const bore=cylinder(r,depth+.2,-depth/2+.05),seat=cylinder(r+2,3.2,-1.5),wire=box(12,6,4,r+1,-1.5);
  const body=remember(kernel.Manifold.difference([supported,bore,seat,wire]));
  const plate=cylinder(r+4,2,1,false),lipOuter=cylinder(r+2-gap/2,2.8,3.4,false),lipInner=cylinder(r,3,3.4,false);
  const lip=remember(kernel.Manifold.difference(lipOuter,lipInner));const cover=remember(kernel.Manifold.union([plate,lip]));
  const cable=box(12,6,6,r+1,3,false),lid=remember(kernel.Manifold.difference(cover,cable));
  return {meshes:[makeMesh(body,'Than_Hoc_LED','#c2acd9'),makeMesh(lid,'Nap_Day_Khop_LED','#8a71b4')],point:s.point,normal:s.normal,diameter,depth,gap};
 }finally{for(const solid of owned)solid.delete()}
}
