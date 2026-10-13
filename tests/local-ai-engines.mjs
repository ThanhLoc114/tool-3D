import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {local3DPlugin} from '../scripts/local3d-plugin.mjs';
const root=await mkdtemp(path.join(tmpdir(),'keycraft-engine-'));
let middleware;
local3DPlugin().configureServer({config:{root,server:{port:5174}},middlewares:{use(prefix,fn){middleware=fn}}});
async function request(url,method='GET',origin){
 const req=Readable.from([]);Object.assign(req,{url,method,headers:origin?{origin}:{}});
 let body;const res={setHeader(){},end(value){body=JSON.parse(value)}};
 await middleware(req,res,()=>{});return {code:res.statusCode,...body};
}
try{
 assert.equal((await request('/ready')).ready,false);
 assert.equal((await request('/jobs?engine=unknown','POST')).code,400);
 assert.equal((await request('/jobs?engine=hunyuan','POST')).code,503);
 assert.equal((await request('/ready','GET','https://external.example')).code,403);
 for(const file of ['.local-ai/ready.json','.local-ai/verified.json','.local-ai/models/TripoSR/complete.json',`.local-ai/venv/${process.platform==='win32'?'Scripts/python.exe':'bin/python'}`]){
  const dest=path.join(root,file);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,'{}');
 }
 const state=await request('/ready');assert.equal(state.engines.tripo,true);assert.equal(state.engines.hunyuan,false);
 assert.equal((await request('/jobs?engine=tripo&resolution=999','POST')).code,400);
 assert.equal((await request('/jobs?engine=tripo','POST')).code,415);
 const orphan='11111111-1111-4111-8111-111111111111',folder=path.join(root,'.local-ai/jobs',orphan);
 await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'job.json'),JSON.stringify({id:orphan,state:'running',engine:'hunyuan',pid:process.pid}));
 assert.equal((await request('/jobs/'+orphan)).engine,'hunyuan');
 assert.equal((await request('/jobs/'+orphan,'DELETE')).code,409,'Do not kill an unrelated process whose PID was reused');
 const complete='22222222-2222-4222-8222-222222222222',done=path.join(root,'.local-ai/jobs',complete);
 await mkdir(done,{recursive:true});await writeFile(path.join(done,'engine.json'),JSON.stringify({engine:'hunyuan'}));await writeFile(path.join(done,'model.glb'),'fixture');
 local3DPlugin().configureServer({config:{root,server:{port:5174}},middlewares:{use(prefix,fn){middleware=fn}}});
 const recovered=await request('/jobs/'+complete);assert.equal(recovered.state,'succeeded');assert.equal(recovered.engine,'hunyuan');
 assert.equal(recovered.surfaceCleaned,false);
 await writeFile(path.join(done,'model.surface.json'),JSON.stringify({version:1}));
 assert.equal((await request('/jobs/'+complete)).surfaceCleaned,true,'Report physical cleanup for restored jobs');
 console.log('PASS: engines fail closed before verification, validate selections, and restrict local origins.');
}finally{await rm(root,{recursive:true,force:true})}
