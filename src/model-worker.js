const fonts=new Map();
self.onmessage=async({data})=>{try{const {id,kind,settings,analysis,preview,fontName}=data;let result;
if(kind==='baby'){const [{buildBabyModel},{default:opentype}]=await Promise.all([import('./baby-model.js'),import('opentype.js')]);if(!fonts.has(fontName)){const res=await fetch('/fonts/'+fontName+'.ttf');if(!res.ok)throw Error('Không tải được phông chữ.');fonts.set(fontName,opentype.parse(await res.arrayBuffer()))}if(!fonts.has('NotoSans-Bold')){const res=await fetch('/fonts/NotoSans-Bold.ttf');if(!res.ok)throw Error('Không tải được phông tiếng Việt.');fonts.set('NotoSans-Bold',opentype.parse(await res.arrayBuffer()))}result=buildBabyModel(fonts.get(fontName),settings,fonts.get('NotoSans-Bold'))}
else if(kind==='fruit'){const {buildFruitModel}=await import('./fruit-model.js');result=buildFruitModel(settings)}
else if(kind==='lamp'){const {buildLampModel}=await import('./lamp-model.js');result=buildLampModel(settings)}
else if(kind==='qr'){const {buildQRModel}=await import('./qr-model.js');result=buildQRModel(data.text,settings)}
else if(kind==='clicker'){const {buildClickerModel}=await import('./clicker-model.js');result=buildClickerModel(analysis,settings,preview)}
else if(kind==='image'){const {buildImageModel}=await import('./image-model.js');result=buildImageModel(analysis,settings,preview)}
else throw Error('Tool không hợp lệ.');
const transfers=[];const meshes=result.meshes.map(m=>{const g=m.geometry,p=g.getAttribute('position').array,n=g.getAttribute('normal').array,index=g.index?.array;transfers.push(p.buffer,n.buffer);if(index)transfers.push(index.buffer);const out={position:p,normal:n,index,color:'#'+m.material.color.getHexString(),name:m.name,userData:m.userData};g.dispose();m.material.dispose();return out});const out={...result,meshes};self.postMessage({id,result:out},transfers);
}catch(e){self.postMessage({id:data.id,error:e.message})}};

