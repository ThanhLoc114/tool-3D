import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import { buildImageModel } from './image-model.js';
import { fuseSolids } from './fuse-solids.js';
import { boolean, flat, offset, circle, roundedGeometry, SCALE, bounds } from './solid-geometry.js';
const shift=(path,x,y)=>path.map(p=>({X:Math.round(p.X+x*SCALE),Y:Math.round(p.Y+y*SCALE)}));
const square=size=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({X:Math.round(x*size/2*SCALE),Y:Math.round(y*size/2*SCALE)}));
export function buildClickerModel(analysis,settings,preview=false){
 const count=settings.switchCount??1;
 if(!Number.isInteger(count)||count<1||count>4)throw Error('Chọn từ 1 đến 4 switch MX.');
 const artwork={...analysis,layerPaths:analysis.layerPaths.map(paths=>analysis.holePaths.length?flat(boolean(paths,analysis.holePaths,ClipperLib.ClipType.ctDifference)):paths)};
 const cap=buildImageModel(artwork,{...settings,outlineSimplify:.12,side:'none'},preview),meshes=cap.meshes;
 try{
  // Reuse the true cap perimeter. Reconstructing it from rounded cap triangles
  // introduces slivers and tiny seams that get amplified by shell offsets.
  const outline=meshes[0].userData.outline;
  const bb=bounds(outline),pitch=19.05;
  const layouts=count===1?[[[0,0]]]:count===2?[[[-pitch/2,0],[pitch/2,0]],[[0,-pitch/2],[0,pitch/2]]]:count===3?[[[-pitch,0],[0,0],[pitch,0]],[[0,-pitch],[0,0],[0,pitch]],[[-pitch/2,-pitch/2],[pitch/2,-pitch/2],[0,pitch/2]]]:[[[-pitch/2,-pitch/2],[pitch/2,-pitch/2],[-pitch/2,pitch/2],[pitch/2,pitch/2]]];
  const candidates=[[0,0]];for(let y=Math.ceil(bb.minY);y<=bb.maxY;y+=2)for(let x=Math.ceil(bb.minX);x<=bb.maxX;x+=2)candidates.push([x,y]);
  candidates.sort((a,b)=>a[0]**2+a[1]**2-b[0]**2-b[1]**2);
  let positions;
  for(const layout of layouts){for(const [x,y] of candidates){
   const points=layout.map(([dx,dy],i)=>[x+dx+i*.01,y+dy+i*.013]);
   if(points.every(([px,py])=>!flat(boolean([shift(square(22),px,py)],outline,ClipperLib.ClipType.ctDifference)).length)){positions=points;break}
  }if(positions)break}
  if(!positions)throw Error(`Hình chưa đủ rộng để lắp ${count} switch MX. Tăng chiều rộng mặt nút hoặc giảm số switch.`);
  for(const mesh of meshes){mesh.geometry.translate(0,0,4.5);mesh.name='Nut_'+mesh.name}
  const add=(name,paths,height,z,color,x=0)=>{const mesh=new THREE.Mesh(roundedGeometry(boolean(paths),height,z,0,preview),new THREE.MeshStandardMaterial({color,roughness:.45}));mesh.geometry.translate(x,0,0);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;meshes.push(mesh)};
  const a=4.15/2,b=1.35/2,cross=[[-a,-b],[-b,-b],[-b,-a],[b,-a],[b,-b],[a,-b],[a,b],[b,b],[b,a],[-b,a],[-b,b],[-a,b]].map(([x,y])=>({X:Math.round(x*SCALE),Y:Math.round(y*SCALE)}));
  const capColor=settings.baseColor||'#b38add';
  // The skirt and MX socket now end on the same underside plane.
  const skirt=flat(boolean(outline,offset(outline,-1.2),ClipperLib.ClipType.ctDifference));
  add('Nut_Vien_Khay_Up',skirt,4.5,0,capColor);
  for(const [i,[x,y]] of positions.entries())add(`Nut_Ngam_MX_${i+1}`,flat(boolean([circle(x,y,3.25)],[shift(cross,x,y)],ClipperLib.ClipType.ctDifference)),4.5,0,capColor);
  const cavity=offset(outline,.4),outer=offset(outline,2.4),outside=bounds(outer),separation=bb.maxX-outside.minX+12;
  const ringY=(outside.minY+outside.maxY)/2,intersections=[];
  // Attach to the actual contour at the ring's Y, not the global bounding box.
  for(const path of outer)for(let i=0;i<path.length;i++){
    const a=path[i],b=path[(i+1)%path.length],y=ringY*SCALE;
    if((a.Y<=y&&b.Y>y)||(b.Y<=y&&a.Y>y))intersections.push((a.X+(y-a.Y)*(b.X-a.X)/(b.Y-a.Y))/SCALE);
  }
  if(!intersections.length)throw Error('Không tìm được vị trí nối tai móc với vỏ.');
  const attachmentX=Math.min(...intersections),ringX=attachmentX-3;
  const bridgeOffset=new ClipperLib.ClipperOffset(2,20),bridge=[];
  bridgeOffset.AddPath([{X:Math.round(ringX*SCALE),Y:Math.round(ringY*SCALE)},{X:Math.round((attachmentX+2)*SCALE),Y:Math.round(ringY*SCALE)}],ClipperLib.JoinType.jtRound,ClipperLib.EndType.etOpenRound);
  bridgeOffset.Execute(bridge,3*SCALE);
  const rimTree=boolean([...outer,circle(ringX,ringY,5),...bridge]);
  if(ClipperLib.JS.PolyTreeToExPolygons(rimTree).length!==1)throw Error('Tai móc chưa nối liền vỏ. Hãy kiểm tra đường bao ảnh.');
  const rim=flat(rimTree),hole=[circle(ringX,ringY,2)];
  const holes=positions.map(([x,y])=>shift(square(14.1),x,y));
  // A running channel allows the taller skirt to pass the plate during travel.
  // Support frames connect the central plate to the floor, outside the switch
  // bodies and pin clearance (16 mm internal square, 18 mm external square).
  const skirtChannel=flat(boolean(cavity,offset(outline,-1.6),ClipperLib.ClipType.ctDifference));
  const supports=positions.flatMap(([x,y])=>flat(boolean([shift(square(18),x,y)],[shift(square(16),x,y)],ClipperLib.ClipType.ctDifference)));
  // Raise the floor together with the switch mount to preserve pin clearance.
  // A taller perimeter surrounds more of the cap while its 0.4 mm gap permits travel.
  const floorHeight=2.4,wellHeight=9.4,plateHeight=1.5,rimHeight=5.5;
  const plateZ=floorHeight+wellHeight,rimZ=plateZ+plateHeight;
  add('Vo_Day',flat(boolean(rim,hole,ClipperLib.ClipType.ctDifference)),floorHeight,0,'#8062ae',separation);
  add('Vo_Khoang_Switch',flat(boolean(rim,[...cavity,...hole],ClipperLib.ClipType.ctDifference)),wellHeight,floorHeight,'#8062ae',separation);
  add('Vo_Gia_Do_Plate',supports,wellHeight,floorHeight,'#8062ae',separation);
  add('Vo_Plate_MX',flat(boolean(rim,[...holes,...hole,...skirtChannel],ClipperLib.ClipType.ctDifference)),plateHeight,plateZ,'#8062ae',separation);
  add('Vo_Vien_Bao_Mat',flat(boolean(rim,[...cavity,...hole],ClipperLib.ClipType.ctDifference)),rimHeight,rimZ,'#8062ae',separation);
  const shellParts=meshes.filter(mesh=>mesh.name.startsWith('Vo_'));
  const shell=fuseSolids(shellParts,'Vo_Lien_Khoi');
  for(const mesh of shellParts){meshes.splice(meshes.indexOf(mesh),1);mesh.geometry.dispose();mesh.material.dispose()}
  meshes.push(shell);
  const capParts=meshes.filter(mesh=>mesh.name==='Nut_De'||mesh.name==='Nut_Vien_Khay_Up'||mesh.name.startsWith('Nut_Ngam_MX_'));
  const capStructure=fuseSolids(capParts,'Nut_Ket_Cau_Lien_Khoi');
  capStructure.userData.switchCount=count;capStructure.userData.skirtHeight=4.5;capStructure.userData.stemHeight=4.5;
  for(const mesh of capParts){meshes.splice(meshes.indexOf(mesh),1);mesh.geometry.dispose();mesh.material.dispose()}
  meshes.push(capStructure);
  const box=new THREE.Box3();for(const mesh of meshes)box.expandByObject(mesh);
  return {...cap,meshes,size:box.getSize(new THREE.Vector3()),detectedHole:false,switchCount:count};
 }catch(error){for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose()}throw error}
}
