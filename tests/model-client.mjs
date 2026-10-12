import assert from 'node:assert/strict';
class FakeWorker{static instance;constructor(){FakeWorker.instance=this;this.sent=[]}postMessage(data){this.sent.push(data)}reply(data){this.onmessage({data})}}
globalThis.Worker=FakeWorker;globalThis.document={dispatchEvent(){}};
const {requestModel}=await import('../src/model-client.js');const w=FakeWorker.instance;
const a=requestModel({kind:'qr',text:'a'}),b=requestModel({kind:'qr',text:'b'}),c=requestModel({kind:'qr',text:'c'});
assert.equal(await b,null);assert.equal(w.sent.length,1);
w.reply({id:w.sent[0].id,result:{meshes:[],qr:{modules:{size:1,data:new Uint8Array([1])}}}});
assert.equal(await a,null);assert.equal(w.sent.length,2);assert.equal(w.sent[1].text,'c');
w.reply({id:w.sent[1].id,result:{meshes:[],qr:{modules:{size:1,data:new Uint8Array([1])}}}});
assert.equal((await c).qr.modules.get(0,0),1);
const d=requestModel({kind:'image'});w.reply({id:w.sent.at(-1).id,error:'Expected error'});await assert.rejects(d,/Expected error/);
console.log('PASS: worker queue keeps newest input, restores QR matrix, forwards errors.');
