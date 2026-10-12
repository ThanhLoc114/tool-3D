import ClipperLib from 'clipper-lib';

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const luminance=rgb=>.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
function lab(rgb){
  const [r,g,b]=rgb.map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92});
  const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
  return [(116*y-16)*.55,500*(x-y),200*(y-z)];
}
function components(mask,w,h){
  const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),groups=[];
  for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){
    let head=0,tail=1;queue[0]=i;seen[i]=1;
    while(head<tail){const p=queue[head++],x=p%w;for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(n>=0&&n<mask.length&&mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n}}
    groups.push(queue.slice(0,tail));
  }
  return groups;
}
function cleanMask(mask,w,h,minArea){
  for(const group of components(mask,w,h))if(group.length<minArea)for(const p of group)mask[p]=0;
  return mask;
}
function smoothMask(mask,w,h){
  const result=new Uint8Array(mask.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)count+=mask[yy*w+xx]}result[y*w+x]=count>=5?1:0}
  return result;
}

export function traceMask(mask,w,h){
  const edges=new Map(),key=(x,y)=>y*(w+1)+x;
  const add=(x,y,a,b)=>{const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(key(a,b))};
  const on=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&mask[y*w+x];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)){
    if(!on(x,y-1))add(x,y,x+1,y);
    if(!on(x+1,y))add(x+1,y,x+1,y+1);
    if(!on(x,y+1))add(x+1,y+1,x,y+1);
    if(!on(x-1,y))add(x,y+1,x,y);
  }
  const paths=[];
  while(edges.size){const first=edges.keys().next().value;let current=first,path=[],guard=0;
    do{path.push({X:current%(w+1)*100,Y:-Math.floor(current/(w+1))*100});const options=edges.get(current);if(!options?.length)break;current=options.pop();if(!options.length)edges.delete(key(path.at(-1).X/100,-path.at(-1).Y/100));if(++guard>mask.length*4)throw Error('Đường viền quá phức tạp. Hãy tăng lọc chi tiết.')}while(current!==first);
    if(current===first&&path.length>=4){path.reverse();path=ClipperLib.Clipper.CleanPolygon(path,45);if(path.length>=3&&Math.abs(ClipperLib.Clipper.Area(path))>10000)paths.push(path)}
  }
  return paths;
}

export function analyzeImage({pixels,width:w,height:h,tolerance=42,colorCount=2,minArea=8}){
  if(!w||!h||w*h>600000||pixels.length!==w*h*4)throw Error('Dữ liệu ảnh không hợp lệ.');
  colorCount=Math.max(2,Math.min(5,Math.round(colorCount)));
  const rgb=i=>[pixels[i*4],pixels[i*4+1],pixels[i*4+2]];
  const corners=[];const corner=Math.max(2,Math.floor(Math.min(w,h)*.055));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((x<corner||x>=w-corner)&&(y<corner||y>=h-corner)&&pixels[(y*w+x)*4+3]>128)corners.push(rgb(y*w+x));
  const background=corners.length?[0,1,2].map(c=>median(corners.map(v=>v[c]))):[255,255,255];
  let transparent=0,saturated=0;
  for(let i=0;i<w*h;i++){if(pixels[i*4+3]<128)transparent++;const c=rgb(i);if(Math.max(...c)-Math.min(...c)>35)saturated++}
  const useAlpha=transparent>w*h*.01,cleanShadow=!useAlpha&&saturated>w*h*.03;
  const candidate=new Uint8Array(w*h),outside=new Uint8Array(w*h),queue=new Int32Array(w*h);
  for(let i=0;i<w*h;i++){
    const c=rgb(i),neutral=Math.max(...c)-Math.min(...c)<Math.min(35,tolerance*.7);
    candidate[i]=pixels[i*4+3]<128||(!useAlpha&&(distance(c,background)<tolerance||(cleanShadow&&neutral&&luminance(c)>70)))?1:0;
  }
  let head=0,tail=0;
  const push=i=>{if(candidate[i]&&!outside[i]){outside[i]=1;queue[tail++]=i}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(head<tail){const p=queue[head++],x=p%w;for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(n>=0&&n<w*h)push(n)}
  let silhouette=Uint8Array.from(outside,v=>1-v);
  if(useAlpha)for(let i=0;i<silhouette.length;i++)if(pixels[i*4+3]<128)silhouette[i]=0;
  const groups=components(silhouette,w,h),largest=Math.max(0,...groups.map(g=>g.length));
  if(largest<20)throw Error('Chưa tìm được hình. Hãy giảm ngưỡng tách nền hoặc dùng ảnh nền đơn sắc.');
  for(const group of groups)if(group.length<Math.max(minArea,largest*.0008))for(const p of group)silhouette[p]=0;
  silhouette=smoothMask(silhouette,w,h);
  let minX=w,maxX=0,minY=h,maxY=0;
  const indices=[];
  for(let i=0;i<silhouette.length;i++)if(silhouette[i]){const x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);indices.push(i)}
  if(indices.length<w*h*.001)throw Error('Vùng hình quá nhỏ. Hãy cắt ảnh sát logo trước khi tải lên.');
  // A near-background enclosed patch on the far left may be the existing keyring hole.
  const enclosed=Uint8Array.from(candidate,(v,i)=>v&&!outside[i]?1:0);
  let holeMask=new Uint8Array(w*h),bestHole=0;
  for(const group of components(enclosed,w,h)){
    if(group.length<Math.max(12,minArea)||group.length>indices.length*.12)continue;
    let sumX=0;for(const p of group)sumX+=p%w;
    if(sumX/group.length>minX+(maxX-minX)*.19)continue;
    if(group.length>bestHole){bestHole=group.length;holeMask=new Uint8Array(w*h);for(const p of group)holeMask[p]=1}
  }
  // Cluster perceptual color with reduced brightness weight so highlights remain with their color.
  const sample=indices.filter((_,i)=>i%Math.max(1,Math.floor(indices.length/9000))===0).map(i=>({rgb:rgb(i),lab:lab(rgb(i))}));
  const centers=[sample[Math.floor(sample.length/2)].lab.slice()];
  while(centers.length<colorCount){let best=-1,selected;for(const p of sample){const d=Math.min(...centers.map(c=>distance(p.lab,c)));if(d>best){best=d;selected=p.lab}}if(best<5)break;centers.push(selected.slice())}
  const nearest=value=>{let winner=0,distanceMin=Infinity;for(let k=0;k<centers.length;k++){const d=distance(value,centers[k]);if(d<distanceMin){distanceMin=d;winner=k}}return winner};
  for(let iteration=0;iteration<10;iteration++){
    const sums=centers.map(()=>[0,0,0,0]);for(const p of sample){const s=sums[nearest(p.lab)];for(let c=0;c<3;c++)s[c]+=p.lab[c];s[3]++}for(let k=0;k<centers.length;k++)if(sums[k][3])centers[k]=sums[k].slice(0,3).map(v=>v/sums[k][3]);
  }
  const labels=new Uint8Array(w*h);labels.fill(255);
  const sums=centers.map(()=>[0,0,0,0]);
  for(const i of indices){const c=rgb(i),k=nearest(lab(c));labels[i]=k;const s=sums[k];for(let j=0;j<3;j++)s[j]+=c[j];s[3]++}
  const palette=sums.map(s=>({rgb:s.slice(0,3).map(v=>Math.round(v/Math.max(1,s[3]))),count:s[3]}));
  let baseIndex=0,bestScore=-1;palette.forEach((p,k)=>{const score=p.count*(1+.65*(1-luminance(p.rgb)/255));if(score>bestScore){bestScore=score;baseIndex=k}});
  const masks=palette.map((_,k)=>cleanMask(smoothMask(Uint8Array.from(labels,v=>v===k?1:0),w,h),w,h,minArea));
  const layerPaths=masks.map(m=>traceMask(m,w,h));
  const preview=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<labels.length;i++){const k=labels[i];preview.set(k===255?[245,243,249,255]:[...palette[k].rgb,255],i*4)}
  return {width:w,height:h,palette,baseIndex,layerPaths,silhouette:traceMask(silhouette,w,h),holePaths:traceMask(holeMask,w,h),bounds:{minX,maxX,minY,maxY},preview,foregroundPixels:indices.length,usesAlpha:useAlpha,touchesEdge:minX===0||minY===0||maxX===w-1||maxY===h-1};
}
