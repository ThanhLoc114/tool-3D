import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const results=[];
for(const file of fs.readdirSync('tests').filter(f=>f.endsWith('.mjs'))){const run=spawnSync(process.execPath,['tests/'+file],{encoding:'utf8',timeout:240000});fs.writeFileSync('artifacts/audit-'+file+'.log',(run.stdout||'')+(run.stderr||''));const status=run.status===0?'PASS':'FAIL';results.push({file,status,exit:run.status,error:run.error?.message});console.log(status+' '+file)}
fs.writeFileSync('artifacts/audit-results.json',JSON.stringify(results,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
