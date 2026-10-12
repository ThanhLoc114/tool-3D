import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import { SCALE, boolean, flat, offset, roundedGeometry, printableTree, circle, connectBase, bounds } from './solid-geometry.js';

// Photo highlights and filament texture can form skinny islands and pinholes.
// Filter in millimetres so increasing image resolution does not create more debris.
export function cleanArtwork(paths){
  const regions=ClipperLib.JS.PolyTreeToExPolygons(boolean(paths)),clean=[];
  for(const region of regions){
    if(Math.abs(ClipperLib.Clipper.Area(region.outer))<.45*SCALE*SCALE)continue;
    // Use erosion only to identify skinny debris. Keep the original artwork
    // boundary so filtering does not reshape letters or change their bevel.
    if(!offset([region.outer],-.18).length)continue;
    clean.push(region.outer);
    for(const hole of region.holes)if(Math.abs(ClipperLib.Clipper.Area(hole))>=.18*SCALE*SCALE)clean.push(hole);
  }
  return printableTree(clean);
}

export function buildImageModel(analysis,settings,preview=false){
  const {width=80,base=2.4,border=1.2,round=.4,hole=4,ring=2.4,side='auto',smooth=.25,baseIndex=analysis.baseIndex,depths=[],colors=[]}=settings;
  for(const [name,value,min,max] of [['width',width,20,180],['base',base,.8,10],['border',border,0,6],['round',round,0,1.2],['hole',hole,2,10],['ring',ring,1.2,6],['smooth',smooth,0,2]])if(!Number.isFinite(value)||value<min||value>max)throw Error(`Thông số ${name} ngoài khoảng ${min}–${max}.`);
  if(!['auto','left','top','none'].includes(side))throw Error('Vị trí tai móc không hợp lệ.');
  if(!Number.isInteger(baseIndex)||baseIndex< -1||baseIndex>=analysis.palette.length)throw Error('Màu đế không hợp lệ.');
  const raw=bounds(analysis.silhouette);
  if(!raw.w||!raw.h)throw Error('Ảnh không có đường viền hợp lệ.');
  const scale=(width-2*border)/raw.w;
  const transform=paths=>paths.map(path=>path.map(p=>({X:Math.round((p.X/SCALE-(raw.minX+raw.maxX)/2)*scale*SCALE),Y:Math.round((p.Y/SCALE-(raw.minY+raw.maxY)/2)*scale*SCALE)})));
  const soften=paths=>{
    if(!smooth)return paths;
    const weight=Math.min(.25,smooth/(scale*.1)*.2);
    return paths.map(path=>{
      let points=path;
      for(let iteration=0;iteration<3;iteration++)points=points.flatMap((p,i)=>{
        const q=points[(i+1)%points.length];
        return [{X:Math.round(p.X*(1-weight)+q.X*weight),Y:Math.round(p.Y*(1-weight)+q.Y*weight)},{X:Math.round(p.X*weight+q.X*(1-weight)),Y:Math.round(p.Y*weight+q.Y*(1-weight))}];
      });
      return ClipperLib.Clipper.CleanPolygon(points,3);
    }).filter(path=>path.length>=3);
  };
  const silhouette=transform(analysis.silhouette).map(path=>settings.outlineSimplify?ClipperLib.Clipper.CleanPolygon(path,settings.outlineSimplify*SCALE):path).filter(path=>path.length>=3);
  let body=boolean(soften(silhouette));
  // Fill internal artwork counters in the backing plate; keyring cutouts are handled separately.
  let basePaths=ClipperLib.JS.PolyTreeToExPolygons(body).map(p=>p.outer);
  body=connectBase(boolean(offset(basePaths,border)));
  if(smooth)body=boolean(offset(offset(flat(body),smooth),-smooth));
  if(settings.baseShape&&settings.baseShape!=='contour'){
    const bb=bounds(flat(body)),cx=(bb.minX+bb.maxX)/2,cy=(bb.minY+bb.maxY)/2;
    const w=bb.w+4,h=bb.h+4;
    if(settings.baseShape==='circle')body=boolean([circle(cx,cy,Math.hypot(w,h)/2)]);
    else if(settings.baseShape==='oval')body=boolean([Array.from({length:128},(_,i)=>({X:Math.round((cx+w/Math.SQRT2*Math.cos(i*Math.PI/64))*SCALE),Y:Math.round((cy+h/Math.SQRT2*Math.sin(i*Math.PI/64))*SCALE)}))]);
    else if(settings.baseShape==='hexagon')body=boolean([Array.from({length:6},(_,i)=>({X:Math.round((cx+w*Math.cos(i*Math.PI/3))*SCALE),Y:Math.round((cy+h*Math.sin(i*Math.PI/3))*SCALE)}))]);
    else{const r=settings.baseShape==='capsule'?Math.min(h/2-1,w/4):3;body=boolean(offset([[{X:Math.round((cx-w/2+r)*SCALE),Y:Math.round((cy-h/2+r)*SCALE)},{X:Math.round((cx+w/2-r)*SCALE),Y:Math.round((cy-h/2+r)*SCALE)},{X:Math.round((cx+w/2-r)*SCALE),Y:Math.round((cy+h/2-r)*SCALE)},{X:Math.round((cx-w/2+r)*SCALE),Y:Math.round((cy+h/2-r)*SCALE)}]],r))}
  }
  const detected=side==='auto'&&analysis.holePaths.length>0;
  let cuts=detected?transform(analysis.holePaths):[];
  if(side==='left'||side==='top'||(side==='auto'&&!detected)){
    const bb=bounds(flat(body)),r=hole/2+ring;
    const top=side==='top';
    const x=top?(bb.minX+bb.maxX)/2:bb.minX-r+Math.min(2,ring);
    const y=top?bb.maxY+r-Math.min(2,ring):(bb.minY+bb.maxY)/2;
    body=connectBase(boolean([...flat(body),circle(x,y,r)]));cuts=[circle(x,y,hole/2)];
  }
  if(cuts.length)body=boolean(flat(body),cuts,ClipperLib.ClipType.ctDifference);
  const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
  const baseColor=settings.baseColor||(baseIndex>=0?(colors[baseIndex]||hex(analysis.palette[baseIndex].rgb)):'#b38add');
  const items=[{name:'De',tree:body,height:base,z:0,color:baseColor}];
  let occupied=[];
  for(let k=0;k<analysis.palette.length;k++){
    if(k===baseIndex||!analysis.layerPaths[k].length)continue;
    const height=depths[k]??1.6;
    if(!Number.isFinite(height)||height<.2||height>8)throw Error('Độ dày lớp nổi cần từ 0.2 đến 8 mm.');
    let paths=transform(analysis.layerPaths[k]);
    // Smooth the actual exported contour; clipping against the pixel outline would restore jagged edges.
    let tree=cleanArtwork(soften(paths));
    // Highlights on the inside wall of a photographed keyring are not raised
    // artwork. Clear a narrow band around the detected hole in colored layers.
    if(cuts.length)tree=boolean(flat(tree),detected?offset(cuts,1.2):cuts,ClipperLib.ClipType.ctDifference);
    tree=cleanArtwork(flat(tree));
    if(occupied.length)tree=boolean(flat(tree),occupied,ClipperLib.ClipType.ctDifference);
    if(!flat(tree).length)continue;
    occupied=flat(boolean([...occupied,...flat(tree)]));
    if(settings.editableParts){
      for(const [regionIndex,region] of ClipperLib.JS.PolyTreeToExPolygons(tree).entries()){
        const removed=(settings.deletedMarks||[]).some(mark=>mark.layer===k&&ClipperLib.Clipper.PointInPolygon({X:Math.round(mark.x*scale*SCALE),Y:Math.round(mark.y*scale*SCALE)},region.outer)!==0&&!region.holes.some(h=>ClipperLib.Clipper.PointInPolygon({X:Math.round(mark.x*scale*SCALE),Y:Math.round(mark.y*scale*SCALE)},h)!==0));
        if(!removed)items.push({name:`Mau_${k+1}_${regionIndex+1}`,tree:boolean([region.outer,...region.holes]),height,z:base,color:colors[k]||hex(analysis.palette[k].rgb),layer:k});
      }
    }else items.push({name:`Mau_${k+1}`,tree,height,z:base,color:colors[k]||hex(analysis.palette[k].rgb)});
  }
  const meshes=[];
  try{
    for(const item of items){
      const geometry=roundedGeometry(item.tree,item.height,item.z,round,preview);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:item.color,roughness:.45}));
      mesh.name=item.name;mesh.castShadow=mesh.receiveShadow=true;meshes.push(mesh);
      if(item.name==='De')mesh.userData.outline=flat(item.tree);
      if(item.layer!==undefined){
        const p=geometry.getAttribute('position');
        mesh.userData.deleteMark={layer:item.layer,x:(p.getX(0)+p.getX(1)+p.getX(2))/(3*scale),y:(p.getY(0)+p.getY(1)+p.getY(2))/(3*scale)};
      }
    }
    const box=new THREE.Box3();for(const m of meshes)box.expandByObject(m);
    const center=box.getCenter(new THREE.Vector3());for(const m of meshes){
      m.geometry.translate(-center.x,-center.y,0);
      if(m.userData.outline)m.userData.outline=m.userData.outline.map(path=>path.map(p=>({X:Math.round(p.X-center.x*SCALE),Y:Math.round(p.Y-center.y*SCALE)})));
    }
    return {meshes,size:box.getSize(new THREE.Vector3()),detectedHole:detected};
  }catch(error){for(const m of meshes){m.geometry.dispose();m.material.dispose()}throw error}
}
