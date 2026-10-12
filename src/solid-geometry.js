import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
const SCALE=1000;
const roundedShapeCache=new WeakMap();
function orient(path,outer=true){if(ClipperLib.Clipper.Orientation(path)!==outer)path.reverse();return path}
function pathFromPoints(points,outer){return orient(points.map(p=>({X:Math.round(p.x*SCALE),Y:Math.round(p.y*SCALE)})),outer)}
function boolean(subject,clip=[],type=ClipperLib.ClipType.ctUnion){const c=new ClipperLib.Clipper();c.StrictlySimple=true;c.AddPaths(ClipperLib.Clipper.CleanPolygons(subject,2),ClipperLib.PolyType.ptSubject,true);if(clip.length)c.AddPaths(clip,ClipperLib.PolyType.ptClip,true);const tree=new ClipperLib.PolyTree();c.Execute(type,tree,ClipperLib.PolyFillType.pftNonZero,ClipperLib.PolyFillType.pftNonZero);return tree}
function flat(tree){return ClipperLib.Clipper.PolyTreeToPaths(tree)}
function offset(paths,delta){const co=new ClipperLib.ClipperOffset(2,20);co.AddPaths(paths,ClipperLib.JoinType.jtRound,ClipperLib.EndType.etClosedPolygon);const out=new ClipperLib.Paths();co.Execute(out,delta*SCALE);return out}
function roundedGeometry(tree,height,z,requested,preview=false){
  // Inset the cap before beveling outward so the design footprint and total height stay fixed.
  let radius=Math.min(requested,height*.45);
  const radiusKey=radius;
  let cache=roundedShapeCache.get(tree);
  if(!cache){cache=new Map();roundedShapeCache.set(tree,cache)}
  const cached=cache.get(radiusKey);
  const original=ClipperLib.JS.PolyTreeToExPolygons(tree);
  // Each disconnected artwork region can take its own bevel radius. A tiny
  // steam curl should not force every letter and the cup to have sharp sides.
  if(original.length>1){
    const parts=original.map(p=>roundedGeometry(boolean([p.outer,...p.holes]),height,z,requested,preview));
    const joined=mergeGeometries(parts);
    joined.userData.actualRadius=Math.max(...parts.map(p=>p.userData.actualRadius||0));
    for(const part of parts)part.dispose();
    return joined;
  }
  let inset;
  if(cached){radius=cached.radius;inset=cached.inset}
  else while(radius>.015){
    const candidate=boolean(offset(flat(tree),-radius));
    const regions=ClipperLib.JS.PolyTreeToExPolygons(candidate);
    if(regions.length===original.length&&regions.every((p,i)=>p.holes.length===original[i].holes.length)){inset=candidate;break}
    radius*=.65;
  }
  if(!inset)radius=0;
  const shapeList=cached?.shapes||shapes(inset||tree);
  if(!cached)cache.set(radiusKey,{radius,inset,shapes:shapeList});
  const source=new THREE.ExtrudeGeometry(shapeList,{
    depth:height-2*radius,steps:1,bevelEnabled:radius>0,
    bevelSize:radius,bevelThickness:radius,bevelSegments:preview?3:8,curveSegments:20
  });
  source.translate(0,0,z+radius);
  const vertices=source.getAttribute('position');
  for(let i=0;i<vertices.count;i++){const value=vertices.getZ(i);if(Math.abs(value-z)<1e-6)vertices.setZ(i,z);else if(Math.abs(value-z-height)<1e-6)vertices.setZ(i,z+height)}
  // Smooth curved walls without averaging the flat cap normals into vertical
  // walls: that made flat surfaces appear dented under directional lighting.
  const originalNormals=!radius?source.getAttribute('normal').clone():null;
  const result=toCreasedNormals(source,Math.PI/3);
  if(!radius){
    // Give matching shell sections identical wall normals at each XY point,
    // independent of height and of how their caps were triangulated.
    const normals=result.getAttribute('normal'),wallNormals=new Map();
    const key=i=>`${vertices.getX(i).toFixed(5)},${vertices.getY(i).toFixed(5)}`;
    for(let i=0;i<vertices.count;i++)if(Math.abs(originalNormals.getZ(i))<1e-6){
      const k=key(i);if(!wallNormals.has(k))wallNormals.set(k,new Map());
      const nx=originalNormals.getX(i),ny=originalNormals.getY(i);
      wallNormals.get(k).set(`${nx.toFixed(5)},${ny.toFixed(5)}`,[nx,ny]);
    }
    for(let i=0;i<vertices.count;i++)if(Math.abs(originalNormals.getZ(i))<1e-6){
      let x=0,y=0;const nx=originalNormals.getX(i),ny=originalNormals.getY(i);
      for(const [a,b] of wallNormals.get(key(i)).values())if(a*nx+b*ny>.5){x+=a;y+=b}
      const length=Math.hypot(x,y)||1;normals.setXYZ(i,x/length,y/length,0);
    }
  }
  result.userData.actualRadius=radius;result.parameters=source.parameters;
  if(result!==source)source.dispose();
  return result;
}
// Remove sub-print-resolution contacts in font outlines before triangulation.
// Some glyphs contain tiny islands touching at a single point, which creates non-manifold edges.
function printableTree(paths){return boolean(offset(offset(flat(boolean(paths)),-.025),.025))}
function shapes(tree){
  const result=[];
  for(const polygon of ClipperLib.JS.PolyTreeToExPolygons(tree)){
    const outer=ClipperLib.Clipper.CleanPolygon(polygon.outer,5);
    if(outer.length<3)continue;
    const shape=new THREE.Shape(outer.map(v=>new THREE.Vector2(v.X/SCALE,v.Y/SCALE)));
    for(const path of polygon.holes){
      const hole=ClipperLib.Clipper.CleanPolygon(path,5);
      if(hole.length>=3)shape.holes.push(new THREE.Path(hole.map(v=>new THREE.Vector2(v.X/SCALE,v.Y/SCALE))));
    }
    result.push(shape);
  }
  return result;
}
function circle(x,y,r){return orient(Array.from({length:96},(_,i)=>({X:Math.round((x+r*Math.cos(i/96*Math.PI*2))*SCALE),Y:Math.round((y+r*Math.sin(i/96*Math.PI*2))*SCALE)})))}
function connectBase(tree){let islands=ClipperLib.JS.PolyTreeToExPolygons(tree).map(p=>p.outer);if(islands.length<2)return tree;islands.sort((a,b)=>Math.abs(ClipperLib.Clipper.Area(b))-Math.abs(ClipperLib.Clipper.Area(a)));let joined=islands.shift(),all=[joined];for(const island of islands){let best=Infinity,pair;const strideA=Math.max(1,Math.floor(joined.length/250)),strideB=Math.max(1,Math.floor(island.length/250));for(let i=0;i<joined.length;i+=strideA)for(let j=0;j<island.length;j+=strideB){const a=joined[i],b=island[j],d=(a.X-b.X)**2+(a.Y-b.Y)**2;if(d<best){best=d;pair=[a,b]}}const co=new ClipperLib.ClipperOffset(2,20),bridge=[];co.AddPath(pair,ClipperLib.JoinType.jtRound,ClipperLib.EndType.etOpenRound);co.Execute(bridge,1.2*SCALE);all.push(island,...bridge);joined=joined.concat(island)}return boolean(all)}
function bounds(paths){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of paths)for(const v of p){minX=Math.min(minX,v.X/SCALE);maxX=Math.max(maxX,v.X/SCALE);minY=Math.min(minY,v.Y/SCALE);maxY=Math.max(maxY,v.Y/SCALE)}return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY}}

export { SCALE, orient, boolean, flat, offset, roundedGeometry, printableTree, shapes, circle, connectBase, bounds };
