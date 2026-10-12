import * as THREE from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {kernel} from './fuse-solids.js';
export function buildFruitModel(s={}){
 const w=Number(s.width??52),gap=Number(s.gap??.35);if(w<46||w>80||gap<.15||gap>.7)throw Error('Kích thước hoặc dung sai ngoài giới hạn.');
 const owned=[],keep=x=>(owned.push(x),x), sphere=(x,y,z,cx=0,cy=0,cz=0)=>keep(keep(keep(kernel.Manifold.sphere(1,64)).scale([x,y,z])).translate([cx,cy,cz])),box=(x,y,z,cx,cy,cz)=>keep(keep(kernel.Manifold.cube([x,y,z],true)).translate([cx,cy,cz])),union=a=>keep(kernel.Manifold.union(a)),sub=(a,b)=>keep(kernel.Manifold.difference(a,b));
 try{
 const r=w/2,ry=r*(s.fruitStyle==='round'?1:s.fruitStyle==='long'?1.2:.85);
 // Flat underside, organic bowl outside, and a continuous interior cavity.
 const outer=sub(sphere(r,ry,20,0,0,18),box(200,200,100,0,0,-50));
 let shell=sub(sub(outer,box(200,200,100,0,0,70)),sphere(r-2.4,ry-2.4,18,0,0,20));
 const plate=sub(sphere(r-1,ry-1,1.2,0,0,11.8),box(14.1,14.1,8,0,0,12));
 const supports=sub(box(19,19,10,0,0,6.8),box(16,16,14,0,0,7));
 const torusG=new THREE.TorusGeometry(4.5,2,12,48);torusG.translate(r+2,0,5);const mesh=new kernel.Mesh({numProp:3,vertProperties:Float32Array.from(torusG.attributes.position.array),triVerts:Uint32Array.from(torusG.index.array)});mesh.merge();const ring=keep(new kernel.Manifold(mesh));torusG.dispose();
 shell=union([shell,plate,supports,ring,box(12,7,4,r-5,0,5)]);
 const leaves=[];for(let i=0;i<10;i++){const a=i*Math.PI*2/10;leaves.push(sphere(4.5,2.5,2.5,r*.82*Math.cos(a),ry*.82*Math.sin(a),i%2?12:6))}const green=union(leaves);shell=sub(shell,green);
 const capR=r-4-gap,capY=ry-4-gap;
 let cap=union([sphere(capR,capY,3.8,0,0,25),sphere(capR,capY,1.2,0,0,22.4)]);
 const stem=sub(keep(keep(kernel.Manifold.cylinder(4.5,3.25,3.25,48)).translate([0,0,17.9])),union([box(4.15,1.35,5,0,0,20),box(1.35,4.15,5,0,0,20)]));cap=union([cap,stem]);
 const seeds=[];for(let i=0;i<Number(s.seeds??24);i++){const a=i*2.399963,rr=Math.sqrt((i+.5)/Number(s.seeds??24))*.82,x=capR*rr*Math.cos(a),y=capY*rr*Math.sin(a),z=25+3.8*Math.sqrt(1-rr*rr);seeds.push(sphere(.65,1.1,.65,x,y,z-.3))}const black=union(seeds);cap=sub(cap,black);
 const toMesh=(solid,name,color,part)=>{if(solid.status()!=='NoError'||solid.isEmpty())throw Error('Hình học không hợp lệ: '+name);const m=solid.getMesh(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(m.vertProperties,3));g.setIndex(new THREE.BufferAttribute(m.triVerts,1));const n=g.toNonIndexed();g.dispose();n.computeVertexNormals();const out=new THREE.Mesh(toCreasedNormals(n,Math.PI/3),new THREE.MeshStandardMaterial({color,roughness:.58}));out.name=name;out.userData.part=part;return out};
 const components=shell.decompose();const count=components.length;components.forEach(c=>c.delete());if(count!==1)throw Error('Vỏ chưa liền khối.');
 return {meshes:[toMesh(shell,'Vo_Thanh_Long',s.shellColor||'#e53275',0),toMesh(green,'Tai_Xanh',s.leafColor||'#57a534',0),toMesh(cap,'Nut_Ruot_MX',s.capColor||'#fff4df',1),toMesh(black,'Hat', '#30251f',1)],switchCount:1,width:w};
 }finally{owned.reverse().forEach(x=>x.delete())}
}

