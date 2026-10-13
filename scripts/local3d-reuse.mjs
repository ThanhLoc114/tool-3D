import {readdir,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function findReusable(cache,bytes,{engine,resolution,surface}){
 const hash=digest(bytes);let raw;
 for(const id of await readdir(cache).catch(()=>[])){
  if(!/^[a-f0-9-]{36}$/.test(id))continue;
  const folder=path.join(cache,id);
  try{
   const config=JSON.parse(await readFile(path.join(folder,'engine.json'),'utf8'));
   if(config.engine!==engine||String(config.resolution)!==String(resolution)||!existsSync(path.join(folder,'model.glb')))continue;
   if(digest(await readFile(path.join(folder,'input')))!==hash)continue;
   const report=JSON.parse(await readFile(path.join(folder,'model.surface.json'),'utf8'));
   if(report.profile===surface && report.version>=(surface==='detail'?3:2))return {id};
   if(engine==='hunyuan'&&existsSync(path.join(folder,'model.raw.glb')))raw=path.join(folder,'model.raw.glb');
  }catch{}
 }
 return raw?{raw}:null;
}
