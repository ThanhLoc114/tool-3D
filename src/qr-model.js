import * as THREE from 'three';
import QRCode from 'qrcode';
import ClipperLib from 'clipper-lib';
import { fuseSolids } from './fuse-solids.js';
import { SCALE, orient, boolean, flat, offset, circle, roundedGeometry } from './solid-geometry.js';
const rect=(x,y,w,h)=>orient([[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([X,Y])=>({X:Math.round(X*SCALE),Y:Math.round(Y*SCALE)})));
export function createQR(text){
  if(!text.trim())throw Error('Nhập nội dung hoặc tải ảnh QR.');
  return QRCode.create(text,{errorCorrectionLevel:'M'});
}
export function buildQRModel(text,s){
  const qr=createQR(text), n=qr.modules.size, pitch=s.width/(n+8), half=s.width/2;
  const pad=4, outerHalf=half+s.margin;
  let outline;
  if(s.shape==='circle')outline=[circle(0,0,outerHalf*Math.SQRT2)];
  else if(s.shape==='hexagon')outline=[orient(Array.from({length:6},(_,i)=>({X:Math.round(outerHalf*1.65*Math.cos(i*Math.PI/3)*SCALE),Y:Math.round(outerHalf*1.65*Math.sin(i*Math.PI/3)*SCALE)})))];
  else if(s.shape==='ticket')outline=flat(boolean([rect(-outerHalf,-outerHalf,outerHalf*2,outerHalf*2)],[circle(-outerHalf,0,s.margin*.6),circle(outerHalf,0,s.margin*.6)],ClipperLib.ClipType.ctDifference));
  else if(s.shape==='flower')outline=flat(boolean([rect(-outerHalf,-outerHalf,outerHalf*2,outerHalf*2),...Array.from({length:12},(_,i)=>circle(Math.cos(i*Math.PI/6)*outerHalf,Math.sin(i*Math.PI/6)*outerHalf,s.margin*.8))]));
  else outline=offset([rect(-outerHalf+2,-outerHalf+2,outerHalf*2-4,outerHalf*2-4)],s.shape==='tag'?4:2);
  const maxY=Math.max(...outline.flat().map(p=>p.Y/SCALE)),minY=Math.min(...outline.flat().map(p=>p.Y/SCALE));
  const mounting=s.mounting||(s.hole?'keychain':'flat'),hasRing=mounting==='keychain';
  const ring=hasRing? [circle(0,maxY+2,5)]:[];
  // A centered tongue provides the same mating interface for every silhouette.
  const tongue=mounting==='stand'?[rect(-8,minY-5,16,9)]:[];
  const baseTree=boolean([...outline,...ring,...tongue],hasRing?[circle(0,maxY+2,2)]:[],ClipperLib.ClipType.ctDifference);
  const meshes=[];
  const add=(tree,h,z,color,name,round=0)=>{const m=new THREE.Mesh(roundedGeometry(tree,h,z,round),new THREE.MeshStandardMaterial({color,roughness:.65}));m.name=name;meshes.push(m)};
  add(baseTree,s.base,0,s.baseColor,'De_QR',.35);
  const modules=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.modules.get(y,x))modules.push(rect(-half+(x+pad)*pitch,half-(y+pad+1)*pitch,pitch,pitch));
  add(boolean([rect(-half,-half,s.width,s.width)],modules,ClipperLib.ClipType.ctDifference),s.relief,s.base,s.lightColor,'Nen_QR');
  add(boolean(modules),s.relief,s.base,s.darkColor,'Ma_QR');
  if(s.frame!=='none'){
    const inner=[rect(-half-.8,-half-.8,s.width+1.6,s.width+1.6)];
    const band=flat(boolean(offset(inner,s.frame==='bold'?1.8:.8),inner,ClipperLib.ClipType.ctDifference));
    let paths=band;
    if(s.frame==='double')paths=[...band,...flat(boolean(offset(inner,2.6),offset(inner,2),ClipperLib.ClipType.ctDifference))];
    add(boolean(paths),s.frameHeight,s.base,s.frameColor,'Khung_QR',.15);
  }
  let standX=0;
  if(mounting==='stand'){
    const depth=s.standDepth??28,height=8,slot=s.base+.5;
    standX=Math.max(...outline.flat().map(p=>p.X/SCALE))+25;
    // One closed solid: rounded pedestal with a blind slot, 3 mm floor beneath it.
    const d=depth/2;
    const lower=roundedGeometry(boolean(offset([rect(-17,-d+3,34,depth-6)],3)),3,0,.3);
    const upper=roundedGeometry(boolean(offset([rect(-17,-d+3,34,depth-6)],3),[rect(-8.25,-slot/2,16.5,slot)],ClipperLib.ClipType.ctDifference),height-3,3,0);
    // Fuse adjoining levels so the pedestal exports as a single watertight mesh.
    const material=new THREE.MeshStandardMaterial({color:s.baseColor,roughness:.65});
    const mesh=fuseSolids([new THREE.Mesh(lower,material),new THREE.Mesh(upper,material)],'Be_Dung_QR');lower.dispose();upper.dispose();material.dispose();mesh.geometry.translate(standX,0,0);meshes.push(mesh);
  }
  return {meshes,qr,pitch,mounting,standX,plateBottom:minY-5,
    joint:mounting==='stand'?{tongueWidth:16,tongueThickness:s.base,insertionDepth:5,slotWidth:16.5,slotThickness:s.base+.5,slotDepth:5}:null};
}
