import {existsSync,createReadStream} from 'node:fs';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
export function local3DPlugin(){
 const jobs=new Map();let active;
 return {name:'keycraft-local-3d',configureServer(server){
 const root=server.config.root,cache=path.join(root,'.local-ai/jobs'),python=path.join(root,'.local-ai/venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'),script=path.join(root,'scripts/local3d-infer.py'),weights=path.join(root,'.local-ai/models/TripoSR/complete.json'),marker=path.join(root,'.local-ai/ready.json');
 server.middlewares.use('/api/local3d',async(req,res,next)=>{const send=(code,data)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 try{if(req.headers.origin&&!['http://127.0.0.1:5174','http://localhost:5174','http://127.0.0.1:'+server.config.server.port,'http://localhost:'+server.config.server.port].includes(req.headers.origin))return send(403,{error:'Chỉ nhận yêu cầu từ tool trên máy.'});const url=(req.url||'').split('?')[0];
 if(url==='/ready'){const verified=existsSync(path.join(root,'.local-ai/verified.json')),ready=existsSync(marker)&&existsSync(python)&&existsSync(weights)&&verified;const parts=path.join(root,'.local-ai/models/TripoSR/parts');const completed=existsSync(parts)?(await readdir(parts)).filter(name=>/^\d+$/.test(name)).length:0;return send(200,{ready,message:ready?'TripoSR cục bộ · CPU tiết kiệm VRAM · không gửi ảnh ra ngoài.':(existsSync(weights)?'Đã tải trọng số; đang kiểm tra AI lần đầu.':'AI đang cài / tải trọng số ('+completed+' đoạn đã tải).')+' Có thể nhập GLB/STL để dùng hốc và khớp.'})}
 if(url==='/jobs'&&req.method==='POST'){
  if(!existsSync(marker)||!existsSync(weights)||!existsSync(path.join(root,'.local-ai/verified.json')))return send(503,{error:'Bộ AI chưa sẵn sàng. Chạy scripts/setup-local3d.ps1.'});if(active)return send(409,{error:'Đã có một tác vụ AI đang chạy.'});
  if(!['image/png','image/jpeg'].includes(req.headers['content-type']))return send(415,{error:'Chỉ nhận PNG/JPG.'});let total=0;const chunks=[];for await(const chunk of req){total+=chunk.length;if(total>10*1024*1024)return send(413,{error:'Ảnh vượt quá 10 MB.'});chunks.push(chunk)}
  const bytes=Buffer.concat(chunks);if(!(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||(bytes[0]===255&&bytes[1]===216)))return send(415,{error:'Nội dung tệp không phải ảnh PNG/JPG.'});
  const id=randomUUID(),folder=path.join(cache,id);await mkdir(folder,{recursive:true});const input=path.join(folder,'input'),output=path.join(folder,'model.glb');await writeFile(input,bytes);const job={id,state:'running',message:'Đang nạp TripoSR; lần đầu tải trọng số AI về máy.',folder};jobs.set(id,job);active=id;
  const child=spawn(python,[script,'--image',input,'--output',output],{cwd:root,windowsHide:true,env:{...process.env,HF_HOME:path.join(root,'.local-ai/hf-cache'),U2NET_HOME:path.join(root,'.local-ai/rembg-cache'),HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1',HF_HUB_DISABLE_SYMLINKS_WARNING:'1',PYTHONUNBUFFERED:'1',PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}});job.child=child;let stderr='';child.stdout.on('data',data=>{for(const line of String(data).split('\n'))if(line.startsWith('STATUS:'))job.message=line.slice(7).trim()});child.stderr.on('data',d=>{stderr=(stderr+String(d)).slice(-4000)});child.on('error',e=>{job.state='failed';job.message='Không khởi chạy được Python AI: '+e.message;active=null});child.on('close',async code=>{if(job.state==='cancelled')return;if(code===0&&existsSync(output)){job.state='succeeded';job.message='Đã dựng vật thể 3D từ ảnh bằng AI cục bộ.'}else{job.state='failed';job.message='AI chưa tạo được mô hình. Xem nhật ký tại .local-ai/jobs/'+id+'/error.log';await writeFile(path.join(folder,'error.log'),stderr)}active=null});return send(202,{id});
 }
 const match=url.match(/^\/jobs\/([a-f0-9-]{36})(\/model)?$/);if(match){let job=jobs.get(match[1]);if(!job){const folder=path.join(cache,match[1]);if(existsSync(path.join(folder,'model.glb')))job={state:'succeeded',message:'Đã dựng vật thể 3D.',folder};else return send(404,{error:'Tác vụ không còn tồn tại; tạo lại từ ảnh.'})}
  if(req.method==='DELETE'){job.state='cancelled';job.message='Đã dừng AI.';job.child?.kill();if(active===match[1])active=null;return send(200,{state:job.state})}
  if(match[2]){if(job.state!=='succeeded')return send(409,{error:'Mô hình chưa hoàn tất.'});res.setHeader('Content-Type','model/gltf-binary');createReadStream(path.join(job.folder,'model.glb')).pipe(res);return}
  return send(200,{id:match[1],state:job.state,message:job.message});
 }return send(404,{error:'Không tìm thấy tác vụ.'});
 }catch(e){send(500,{error:e.message})}
 });
 }};
}
