import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

test('public files, protected storage, validation, idempotent lead submission',async()=>{
  const directory = await mkdtemp(path.join(tmpdir(),'premier-test-'));
  const child = spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4174',HOST:'127.0.0.1',LEAD_DATA_DIR:directory,LEAD_WEBHOOK_URL:''},stdio:['ignore','pipe','pipe']});
  try {
    await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error(`Server exited: ${code}`)));});
    const base = 'http://127.0.0.1:4174';
    const post = (body,origin=base)=>fetch(base+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
    const homepage = await fetch(base); assert.equal(homepage.status,200);assert.match(await homepage.text(),/Снова улыбаться/);
    for(const file of ['/server.mjs','/.env','/data/test.json','/research/source.html','/assets/../server.mjs'])assert.equal((await fetch(base+file)).status,404);
    assert.equal((await post({})).status,400);
    assert.equal((await post(null)).status,400);
    const lead = {name:'Тест',phone:'+79990000000',consent:true,requestId:randomUUID(),website:''};
    assert.equal((await post(lead,'https://unrelated.invalid')).status,403);
    assert.equal((await post({...lead,consent:false})).status,400);
    assert.equal((await post({...lead,phone:'123'})).status,400);
    const replies = await Promise.all([post(lead),post(lead)]);
    for(const reply of replies){assert.equal(reply.status,200);assert.equal((await reply.json()).preview,true);}
    assert.equal((await readdir(directory)).length,1);
    const stored = JSON.parse(await readFile(path.join(directory,lead.requestId+'.json'),'utf8'));
    assert.equal(stored.phone,lead.phone);assert.equal(stored.status,'preview');
    assert.equal((await post({...lead,name:'Другое имя'})).status,409);
  } finally {
    child.kill();await new Promise(resolve=>child.once('exit',resolve));
    assert.equal(path.dirname(directory),path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('premier-test-'));
    await rm(directory,{recursive:true,force:true});
  }
});
