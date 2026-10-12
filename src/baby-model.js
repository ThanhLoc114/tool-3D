import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import { boolean,flat,offset,circle,roundedGeometry,bounds,orient,SCALE } from './solid-geometry.js';
import { buildQRModel } from './qr-model.js';
import reference from './baby-reference.json' with {type:'json'};
const rect=(x,y,w,h,r=0)=>{const p=orient([[x+r,y+r],[x+w-r,y+r],[x+w-r,y+h-r],[x+r,y+h-r]].map(([X,Y])=>({X:X*SCALE,Y:Y*SCALE})));return r?offset([p],r):[p]};
// Remove raster stair steps, then round the contour without moving text strokes.
export function smoothBabyOutline(paths){
 return paths.map(path=>{let points=ClipperLib.Clipper.CleanPolygon(path,100);if(points.length<3)return path;
  for(let pass=0;pass<2;pass++){const next=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];next.push({X:Math.round(a.X*.75+b.X*.25),Y:Math.round(a.Y*.75+b.Y*.25)},{X:Math.round(a.X*.25+b.X*.75),Y:Math.round(a.Y*.25+b.Y*.75)})}points=next}return points});
}
const smoothBoard=smoothBabyOutline(reference.silhouette);
// Rebuild the four large frames as analytic rounded rectangles, rather than
// tracing their inner/outer edges independently from antialiased pixels.
const frameBoxes=[[-75.7,-37.6,75,22.8],[1.2,-37.6,75,22.8],[-75.7,-63,75,23.2],[1.2,-63,75,23.2]];
const framePaths=frameBoxes.flatMap(([x,y,w,h])=>flat(boolean(rect(x,y,w,h,8),rect(x+.8,y+.8,w-1.6,h-1.6,7.2),ClipperLib.ClipType.ctDifference)));
const frameErase=frameBoxes.flatMap(([x,y,w,h])=>flat(boolean(rect(x-.5,y-.5,w+1,h+1,8.5),rect(x+1.5,y+1.5,w-3,h-3,6.5),ClipperLib.ClipType.ctDifference)));
// Only keep original artwork in the illustration and the four icon boxes.
// Pixels from old labels and old frame edges must never become raised strips.
const artworkZones=[...rect(-90,7.9,180,80),...rect(-70,-37,20,23),...rect(6,-37,21,23),...rect(-70,-63.5,20,23.5),...rect(6,-63.5,21,23.5)];
export function filterBabyArtwork(paths){
 const clean=[];
 for(const region of ClipperLib.JS.PolyTreeToExPolygons(boolean(paths))){
  if(Math.abs(ClipperLib.Clipper.Area(region.outer))<.25*SCALE*SCALE)continue;
  if(!offset([region.outer],-.09).length)continue;
  clean.push(region.outer,...region.holes.filter(h=>Math.abs(ClipperLib.Clipper.Area(h))>.035*SCALE*SCALE));
 }
 return flat(boolean(clean));
}
const cleanArt=reference.art.map(paths=>filterBabyArtwork(flat(boolean(flat(boolean(paths,frameErase,ClipperLib.ClipType.ctDifference)),artworkZones,ClipperLib.ClipType.ctIntersection))));
const artworkTrees=cleanArt.map(paths=>boolean(paths));
const artworkGeometryCache=new Map();
export function textOutline(font,text,x,y,maxWidth,height,fallbackFont){
 if(!text.trim())return [];
 if(fallbackFont&&[...text.normalize('NFC')].some(c=>!font.hasChar(c)))font=fallbackFont;
 for(const c of text.normalize('NFC'))if(!font.hasChar(c))throw Error('Font không hỗ trợ ký tự '+c);
 const commands=[];let advance=0,previous=null;for(const char of text.normalize('NFC')){const glyph=font.charToGlyph(char),scale=100/font.unitsPerEm;if(previous)advance+=font.getKerningValue(previous,glyph)*scale;commands.push(...glyph.getPath(advance,0,100).commands);advance+=(glyph.advanceWidth||font.unitsPerEm/2)*scale;previous=glyph}
 const sp=new THREE.ShapePath();for(const c of commands){if(c.type==='M')sp.moveTo(c.x,-c.y);if(c.type==='L')sp.lineTo(c.x,-c.y);if(c.type==='Q')sp.quadraticCurveTo(c.x1,-c.y1,c.x,-c.y);if(c.type==='C')sp.bezierCurveTo(c.x1,-c.y1,c.x2,-c.y2,c.x,-c.y);if(c.type==='Z')sp.currentPath.closePath()}
 const paths=[];for(const shape of sp.toShapes(false)){paths.push(orient(shape.getPoints(12).map(v=>({X:v.x*SCALE,Y:v.y*SCALE}))));for(const hole of shape.holes)paths.push(orient(hole.getPoints(12).map(v=>({X:v.x*SCALE,Y:v.y*SCALE})),false))}
 const b=bounds(paths),f=Math.min(maxWidth/b.w,height/b.h);return paths.map(p=>p.map(v=>({X:Math.round((v.X-(b.minX+b.maxX)/2*SCALE)*f+x*SCALE),Y:Math.round((v.Y-(b.minY+b.maxY)/2*SCALE)*f+y*SCALE)})));
}
export function buildBabyModel(font,s,fallbackFont){
 if(!s.name.trim())throw Error('Nhập tên bé.');
 const factor=s.width/180,meshes=[],layers=[],base=s.base;
 const add=(paths,h,z,color,name,round=.2)=>layers.push({paths,h,z:z>=base+s.relief?base+s.relief:z,color,name,round});
 // Broad cloud base, continuous silhouette and rounded shoulders.
 const board=s.frameStyle==='rounded'?rect(-90,-80.6,180,168,10):s.frameStyle==='scallop'?flat(boolean([...rect(-90,-80.6,180,168,10),...Array.from({length:7},(_,i)=>circle(-75+i*25,77,14))])):s.frameStyle==='arch'?flat(boolean([...rect(-90,-80.6,180,155,10),circle(0,46,90)])):smoothBoard;
 const withTongue=s.mounting==='stand'?flat(boolean([...board,...rect(-8/factor,-80.6-5/factor,16/factor,5/factor+4)])):board;
 add(withTongue,base,0,s.outlineColor,'Bang_Nen',.55);
 add(offset(board,-1.6),s.relief,base,s.creamColor,'Mat_Bang',.3);
 const top=base+s.relief;
 // Trace the supplied illustration, independently of its original lettering.
 for(let i=0;i<cleanArt.length;i++)add(cleanArt[i],s.relief,top,s[reference.colors[i]],'Minh_Hoa_'+i,.08);
 add(framePaths,s.relief,top,s.outlineColor,'Khung_Thong_Tin',.24);
 add(textOutline(font,s.name,0,-3,135,18,fallbackFont),s.textDepth,top,s.textColor,'Ten_Be',.3);
 const items=[['Ngày sinh',s.date,-38,-26],['Giờ sinh',s.time,39,-26],['Cân nặng',s.weight+' kg',-38,-51],['Chiều dài',s.length+' cm',39,-51]];
 for(let i=0;i<items.length;i++){const [label,value,x,y]=items[i];add(textOutline(font,label,x+12,y+5,43,4,fallbackFont),s.textDepth,top,s.textColor,'Nhan_'+i,.15);add(textOutline(font,value,x+12,y-4,43,7.5,fallbackFont),s.textDepth,top,s.textColor,'Thong_Tin_'+i,.2)}
 let standX=0;
 if(s.mounting==='stand'){const result=buildQRModel('Baby',{width:s.width,margin:4,base:s.base,relief:.4,frameHeight:.4,shape:'rounded',frame:'none',mounting:'stand',standDepth:s.standDepth,baseColor:s.outlineColor,lightColor:'#ffffff',darkColor:'#000000'});const stand=result.meshes.find(m=>m.name==='Be_Dung_QR');standX=result.standX;meshes.push(stand);for(const m of result.meshes)if(m!==stand){m.geometry.dispose();m.material.dispose()}}
 for(let i=0;i<layers.length;i++){
  const layer=layers[i],artIndex=layer.name.startsWith('Minh_Hoa_')?Number(layer.name.split('_').at(-1)):-1;
  let tree=artIndex>=0?artworkTrees[artIndex]:boolean(layer.paths);
  if(artIndex<0&&layer.z>=top){const clips=layers.slice(i+1).filter(l=>l.z>=top).flatMap(l=>l.paths);if(clips.length)tree=boolean(flat(tree),clips,ClipperLib.ClipType.ctDifference)}
  if(!flat(tree).length)continue;
  const key=JSON.stringify([artIndex,layer.h,layer.z,factor]);
  let geometry=artIndex>=0?artworkGeometryCache.get(key)?.clone():null;
  if(!geometry){geometry=roundedGeometry(tree,layer.h,layer.z,layer.round);geometry.scale(factor,factor,1);if(artIndex>=0){if(artworkGeometryCache.size>=8){const oldest=artworkGeometryCache.keys().next().value;artworkGeometryCache.get(oldest).dispose();artworkGeometryCache.delete(oldest)}artworkGeometryCache.set(key,geometry.clone())}}
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:layer.color,roughness:.65}));mesh.name=layer.name;meshes.push(mesh);
 }
 return {meshes,mounting:s.mounting,standX,plateBottom:-80.6*factor-5};
}
