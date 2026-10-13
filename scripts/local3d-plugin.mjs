import {existsSync,createReadStream,statSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {findReusable} from './local3d-reuse.mjs';
const uuid=/^[a-f0-9-]{36}$/;
function readJSON(file){try{return JSON.parse(readFileSync(file,'utf8'))}catch{return null}}
function meshError(text){
 if(text.includes('thiếu một vùng lớn'))return 'AI dựng thiếu một vùng lớn. Không thể tự vá mà giữ đúng hình dáng; thử ảnh rõ hơn, một vật thể riêng biệt. Lưới gốc đã được lưu trên máy.';
 if(text.includes('vẫn chưa kín')||text.includes('bề mặt chưa kín'))return 'AI đã chạy nhưng lưới vẫn chưa kín sau bước sửa nên chưa thể xuất để in. Thử ảnh rõ hơn, một vật thể riêng biệt.';
 return null;
}
function alive(pid){if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true}catch{return false}}
async function ownsProcess(job){
 const pid=job.child?.pid||job.pid;if(!alive(pid))return false;
 if(job.child?.pid===pid&&job.child.exitCode===null)return true;
 try{
  const result=process.platform==='win32'?await promisify(execFile)('powershell',['-NoProfile','-NonInteractive','-Command',`$command=(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine; [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($command))`],{windowsHide:true}):await promisify(execFile)('ps',['-p',String(pid),'-o','args=']);
  const text=process.platform==='win32'?Buffer.from(result.stdout.trim(),'base64').toString('utf8'):result.stdout;
  const command=text.replaceAll('\\','/').toLowerCase(),input=path.join(job.folder,'input').replaceAll('\\','/').toLowerCase();
  return (command.includes(input)||command.includes(path.join(job.folder,'model.glb').replaceAll('\\','/').toLowerCase()))&&(command.includes('hunyuan-infer.py')||command.includes('local3d-infer.py')||command.includes('local3d-reprocess.py'));
 }catch{return false}
}
export function local3DPlugin(){
 return {name:'keycraft-local-3d',configureServer(server){
  const root=server.config.root,cache=path.join(root,'.local-ai/jobs'),jobs=new Map();let active,submitting=false;
  const pythonFor=engine=>path.join(root,engine==='hunyuan'?'.local-ai/hunyuan-venv':'.local-ai/venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  function save(job){try{const file=path.join(job.folder,'job.json');writeFileSync(file+'.tmp',JSON.stringify({id:job.id,engine:job.engine,pid:job.pid,startedAt:job.startedAt,state:job.state,message:job.message}));renameSync(file+'.tmp',file)}catch(e){console.error('Cannot persist local AI status:',e.message)}}
  function getJob(id){
   if(!uuid.test(id))return null;
   let job=jobs.get(id);const folder=path.join(cache,id);
   if(!job){const saved=readJSON(path.join(folder,'job.json')),engine=readJSON(path.join(folder,'engine.json'))?.engine||'tripo';if(!saved&&!existsSync(path.join(folder,'model.glb')))return null;job={...saved,id,engine:saved?.engine||engine,folder};jobs.set(id,job)}
   if(existsSync(path.join(folder,'model.glb'))){job.state='succeeded';job.message='Đã dựng vật thể 3D từ ảnh bằng AI cục bộ.'}
   else if(job.state==='running'&&!alive(job.pid)){job.state='failed';job.message='Tiến trình AI đã dừng trước khi hoàn tất. Tạo lại từ ảnh.';save(job)}
   if(job.state==='failed'&&readJSON(path.join(job.folder,'job.json'))?.state==='failed'){try{job.message=meshError(readFileSync(path.join(job.folder,'error.log'),'utf8'))||job.message}catch{}}
   return job;
  }
  async function runningJob(){if(!existsSync(cache))return null;for(const id of await readdir(cache)){if(!uuid.test(id))continue;const job=getJob(id);if(job?.state==='running'){if(await ownsProcess(job)){active=id;return id}job.state='failed';job.message='Tiến trình AI cũ không còn chạy.';save(job)}}active=null;return null}
  function engines(){const verified=readJSON(path.join(root,'.local-ai/hunyuan-verified.json')),complete=readJSON(path.join(root,'.local-ai/models/Hunyuan3D-2mini/complete.json'));const weight=path.join(root,'.local-ai/models/Hunyuan3D-2mini/hunyuan3d-dit-v2-mini-turbo/model.fp16.safetensors');return {tripo:existsSync(pythonFor('tripo'))&&existsSync(path.join(root,'.local-ai/ready.json'))&&existsSync(path.join(root,'.local-ai/verified.json'))&&existsSync(path.join(root,'.local-ai/models/TripoSR/complete.json')),hunyuan:existsSync(pythonFor('hunyuan'))&&existsSync(weight)&&statSync(weight).size===3822584202&&verified?.engine==='Hunyuan3D-2mini-Turbo'&&verified.watertight===true&&complete?.sha256==='bdbcef30dd0149a281e17d5b5b1fdad1122c904e098a42f3100e04e03c247bc4'}}
  server.middlewares.use('/api/local3d',async(req,res)=>{
   const send=(code,data)=>{res.statusCode=code;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
   try{
    const origins=['http://127.0.0.1:5174','http://localhost:5174','http://127.0.0.1:'+server.config.server.port,'http://localhost:'+server.config.server.port];
    if(req.headers.origin&&!origins.includes(req.headers.origin))return send(403,{error:'Chỉ nhận yêu cầu từ tool trên máy.'});
    const parsed=new URL(req.url||'/','http://localhost'),url=parsed.pathname;
    if(url==='/ready'){const available=engines();return send(200,{ready:available.tripo||available.hunyuan,engines:available,message:available.hunyuan?'Hunyuan3D-2mini Turbo · chạy CPU trên máy · ảnh không gửi ra ngoài.':available.tripo?'TripoSR sẵn sàng. Hunyuan3D-2mini chưa hoàn tất cài đặt và kiểm chứng.':'AI cục bộ chưa sẵn sàng. Có thể nhập GLB/STL.'})}
    if(url==='/jobs'&&req.method==='POST'){
     const engine=parsed.searchParams.get('engine')||'tripo',resolution=parsed.searchParams.get('resolution')||'255',surface=parsed.searchParams.get('surface')||'balanced';
     if(!['tripo','hunyuan'].includes(engine)||!['127','255'].includes(resolution)||!['balanced','detail'].includes(surface))return send(400,{error:'Bộ AI hoặc chất lượng không hợp lệ.'});
     if(!engines()[engine])return send(503,{error:'Bộ AI đã chọn chưa được cài đặt và kiểm chứng.'});

     if(!['image/png','image/jpeg'].includes(req.headers['content-type']))return send(415,{error:'Chỉ nhận PNG/JPG.'});
     let total=0;const chunks=[];for await(const chunk of req){total+=chunk.length;if(total>10*1024*1024)return send(413,{error:'Ảnh vượt quá 10 MB.'});chunks.push(chunk)}
     const bytes=Buffer.concat(chunks);if(!(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||(bytes[0]===255&&bytes[1]===216)))return send(415,{error:'Nội dung tệp không phải ảnh PNG/JPG.'});
     if(submitting)return send(409,{error:"Đang nhận một yêu cầu tạo mô hình khác; thử lại sau."});
     submitting=true;try{
     const reused=await findReusable(cache,bytes,{engine,resolution,surface});
     if(reused?.id)return send(200,{id:reused.id,reused:true});
     if(await runningJob())return send(409,{error:'Máy chỉ xử lý một ảnh mỗi lần. Đang có tác vụ AI chạy; chờ hoàn tất hoặc dừng tác vụ đó để tạo ảnh khác.'});
     const id=randomUUID(),folder=path.join(cache,id),input=path.join(folder,'input'),output=path.join(folder,'model.glb');await mkdir(folder,{recursive:true});await writeFile(input,bytes);await writeFile(path.join(folder,'engine.json'),JSON.stringify({engine,resolution,surface}));
     const job={id,engine,startedAt:Date.now(),state:'running',message:reused?.raw?'Đang xử lý lại lưới đã lưu, không chạy lại AI…':'Đang nạp '+(engine==='hunyuan'?'Hunyuan3D-2mini':'TripoSR')+' trên máy…',folder};jobs.set(id,job);active=id;
     const args=reused?.raw?[path.join(root,'scripts','local3d-reprocess.py'),'--model',reused.raw,'--output',output,'--surface',surface]:[path.join(root,'scripts',engine==='hunyuan'?'hunyuan-infer.py':'local3d-infer.py'),'--image',input,'--output',output];if(engine==='hunyuan'&&!reused?.raw)args.push('--resolution',resolution,'--surface',surface);
     const child=spawn(pythonFor(engine),args,{cwd:root,windowsHide:true,env:{...process.env,HF_HOME:path.join(root,'.local-ai/hf-cache'),U2NET_HOME:path.join(root,'.local-ai/rembg-cache'),HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1',HF_HUB_DISABLE_SYMLINKS_WARNING:'1',PYTHONUNBUFFERED:'1',PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}});job.child=child;job.pid=child.pid;save(job);
     let stderr='',stdout='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
     child.stdout.on('data',data=>{stdout+=data;const lines=stdout.split('\n');stdout=lines.pop();for(const line of lines)if(line.startsWith('STATUS:')){job.message=line.slice(7).trim();save(job)}});
     child.stderr.on('data',data=>{stderr=(stderr+data).slice(-4000)});
     child.on('error',e=>{job.state='failed';job.message='Không khởi chạy được Python AI: '+e.message;if(active===id)active=null;save(job)});
     child.on('close',async code=>{if(['cancelled','cancelling'].includes(job.state)){job.state='cancelled';job.message='Đã dừng AI.'}else if(code===0&&existsSync(output)){job.state='succeeded';job.message='Đã dựng vật thể 3D từ ảnh bằng AI cục bộ.'}else{job.state='failed';job.message=meshError(stderr)||'AI xử lý thất bại. Chi tiết nằm trong nhật ký .local-ai/jobs/'+id+'/error.log';await writeFile(path.join(folder,'error.log'),stderr)}if(active===id)active=null;save(job)});
     return send(202,{id});
     }finally{submitting=false}
    }
    const match=url.match(/^\/jobs\/([a-f0-9-]{36})(\/model)?$/);
    if(!match)return send(404,{error:'Không tìm thấy tác vụ.'});
    const job=getJob(match[1]);if(!job)return send(404,{error:'Tác vụ không còn tồn tại; tạo lại từ ảnh.'});
    if(req.method==='DELETE'){
     const pid=job.child?.pid||job.pid;
     if(alive(pid)&&!await ownsProcess(job)){job.state='failed';job.message='Tiến trình AI cũ không còn chạy.';save(job);if(active===job.id)active=null;return send(409,{error:job.message})}
     job.state='cancelling';
     if(alive(pid)){try{if(process.platform==='win32')await promisify(execFile)('taskkill',['/PID',String(pid),'/T','/F'],{windowsHide:true});else process.kill(pid,'SIGTERM')}catch(e){if(alive(pid)){job.state='running';save(job);throw Error('Chưa dừng được tiến trình AI: '+e.message)}}}
     job.state='cancelled';job.message='Đã dừng AI.';if(active===job.id)active=null;save(job);return send(200,{state:job.state});
    }
    if(match[2]){if(job.state!=='succeeded')return send(409,{error:'Mô hình chưa hoàn tất.'});const report=readJSON(path.join(job.folder,'model.surface.json')),name=report?.file==='model.cleaned.glb'&&existsSync(path.join(job.folder,'model.cleaned.glb'))?'model.cleaned.glb':'model.glb';res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','model/gltf-binary');const stream=createReadStream(path.join(job.folder,name));res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);return}
    return send(200,{id:job.id,engine:job.engine,state:job.state,message:job.message,startedAt:job.startedAt||statSync(job.folder).birthtimeMs,surfaceCleaned:(readJSON(path.join(job.folder,'model.surface.json'))?.version||0)>=1,surfaceRevision:readJSON(path.join(job.folder,'model.surface.json'))?.version||0,metrics:readJSON(path.join(job.folder,'model.metrics.json'))});
   }catch(e){send(500,{error:e.message})}
  });
 }};
}
