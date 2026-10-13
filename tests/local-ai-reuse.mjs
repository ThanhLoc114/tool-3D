import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import path from 'node:path';import {tmpdir} from 'node:os';import {findReusable} from '../scripts/local3d-reuse.mjs';
const cache=await mkdtemp(path.join(tmpdir(),'keycraft-reuse-'));const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';const folder=path.join(cache,id);const options={engine:'hunyuan',resolution:'255',surface:'detail'};
try{await mkdir(folder);await writeFile(path.join(folder,'input'),'image');await writeFile(path.join(folder,'engine.json'),JSON.stringify(options));await writeFile(path.join(folder,'model.glb'),'model');await writeFile(path.join(folder,'model.raw.glb'),'raw');await writeFile(path.join(folder,'model.surface.json'),JSON.stringify({version:3,profile:'detail'}));
assert.deepEqual(await findReusable(cache,Buffer.from('image'),options),{id});
assert.equal(await findReusable(cache,Buffer.from('other'),options),null);
assert.equal(await findReusable(cache,Buffer.from('image'),{...options,resolution:'127'}),null);
assert.deepEqual(await findReusable(cache,Buffer.from('image'),{...options,surface:'balanced'}),{raw:path.join(folder,'model.raw.glb')});
await writeFile(path.join(folder,'model.surface.json'),JSON.stringify({version:2,profile:'detail'}));assert.ok((await findReusable(cache,Buffer.from('image'),options)).raw,'Reprocess old cleanup versions');
console.log('PASS: reuse requires matching image, engine, resolution and cleanup version; changed profile reuses only raw geometry.');
}finally{await rm(cache,{recursive:true,force:true})}
