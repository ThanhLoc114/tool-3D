import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import { boolean,flat,offset,circle,orient,SCALE,roundedGeometry } from './solid-geometry.js';
import { fuseSolids } from './fuse-solids.js';
const rectangle=(x,y,w,h)=>orient([[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([X,Y])=>({X:X*SCALE,Y:Y*SCALE})));
export function calculatePrintCost({mass,hours,pricePerKg,watts,electricity,waste=0}){for(const v of [mass,hours,pricePerKg,watts,electricity,waste])if(!Number.isFinite(v)||v<0)throw Error('Nhập số hợp lệ, không âm.');const material=mass*(1+waste/100)/1000*pricePerKg,power=hours*watts/1000*electricity;return {material,power,total:material+power}}
export function spoolLength(mass,diameter=1.75,density=1.24){if(mass<0||diameter<=0||density<=0)throw Error('Thông số cuộn nhựa không hợp lệ.');return mass/(density*Math.PI*(diameter/2)**2)}
export function bedFit(w,h,z,bedW=256,bedH=256,bedZ=256){if([w,h,z,bedW,bedH,bedZ].some(v=>!Number.isFinite(v)||v<=0))throw Error('Kích thước phải lớn hơn 0.');return {direct:w<=bedW&&h<=bedH&&z<=bedZ,rotated:h<=bedW&&w<=bedH&&z<=bedZ}}
export function buildCalibration(kind='tolerance',step=.1){
 const meshes=[],material=new THREE.MeshStandardMaterial({color:'#9e81cf',roughness:.65});
 const add=(paths,height,z,name)=>{const m=new THREE.Mesh(roundedGeometry(boolean(paths),height,z,0),material.clone());m.name=name;meshes.push(m);return m};
 if(kind==='cube'){const m=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),material.clone());m.geometry.translate(0,0,10);m.name='Cube_20mm';meshes.push(m)}
 else if(kind==='wall'){for(let i=0;i<5;i++)add([rectangle(-20+i*10,-10,.4+i*.2,20)],12,0,'Wall_'+(.4+i*.2).toFixed(1)+'mm')}
 else{if(!Number.isFinite(step)||step<.05||step>.3)throw Error('Bước dung sai từ 0,05–0,3 mm.');const holes=[],parts=[];for(let i=0;i<5;i++){const x=-32+i*16;holes.push(circle(x,0,3+i*step/2));parts.push({x,gap:i*step})}const plate=add(flat(boolean(offset([rectangle(-39,-7,78,14)],2),holes,ClipperLib.ClipType.ctDifference)),5,0,'Hole_Card');plate.userData.clearances=parts.map(p=>p.gap);const pieces=[new THREE.Mesh(roundedGeometry(boolean(offset([rectangle(-39,-29,78,14)],2)),3,0,0),material)];for(const p of parts)pieces.push(new THREE.Mesh(roundedGeometry(boolean([circle(p.x,-22,3)]),8,3,0),material));const peg=fuseSolids(pieces,'Peg_Card_6mm');pieces.forEach(p=>p.geometry.dispose());meshes.push(peg)}
 material.dispose();return meshes;
}
