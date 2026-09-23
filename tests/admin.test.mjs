import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,scryptSync} from 'node:crypto';

test('administrator authentication, CSRF, persistent edits, conflicts and logout',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'premier-admin-test-'));
 const password='test-only-not-a-production-password',salt='test-only-salt';
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4175',HOST:'127.0.0.1',PUBLIC_ORIGIN:'http://127.0.0.1:4175',LEAD_DATA_DIR:directory,LEAD_WEBHOOK_URL:'',ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex')},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error('Server exit '+code)));});
  const base='http://127.0.0.1:4175';let cookie='',csrf='';
  const call=(route,method='GET',body,extra={})=>fetch(base+route,{method,headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,...extra},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await call('/admin/')).status,200);
  assert.equal((await call('/api/admin/leads')).status,401);
  assert.equal((await call('/api/admin/login','POST',{username:'admin',password:'wrong'})).status,401);
  assert.equal((await call('/api/admin/login','POST',{username:'admin',password},{Origin:'https://evil.invalid'})).status,403);
  const login=await call('/api/admin/login','POST',{username:'admin',password});assert.equal(login.status,200);
  assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);cookie=login.headers.get('set-cookie').split(';')[0];csrf=(await login.json()).csrf;
  const lead={name:'Тест панели',phone:'+79990000001',consent:true,requestId:randomUUID()};
  assert.equal((await call('/api/leads','POST',lead)).status,200);
  const list=await (await call('/api/admin/leads')).json();assert.equal(list.leads.length,1);assert.equal(list.leads[0].workflow,'new');assert.equal(list.leads[0].fingerprint,undefined);
  const route='/api/admin/leads/'+lead.requestId,edit={workflow:'booked',note:'Тестовый комментарий',version:0};
  assert.equal((await call(route,'PATCH',edit,{'X-CSRF-Token':''})).status,403);
  assert.equal((await call(route,'PATCH',{...edit,workflow:'invalid'})).status,400);
  const results=await Promise.all([call(route,'PATCH',edit),call(route,'PATCH',edit)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const saved=JSON.parse(await readFile(path.join(directory,lead.requestId+'.json'),'utf8'));assert.equal(saved.workflow,'booked');assert.equal(saved.note,edit.note);assert.equal(saved.history.length,1);
  assert.equal((await call('/data/'+lead.requestId+'.json')).status,404);
  assert.equal((await call('/api/admin/logout','POST',{})).status,200);
  assert.equal((await call('/api/admin/leads')).status,401);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));assert.equal(path.dirname(directory),path.resolve(tmpdir()));assert.ok(path.basename(directory).startsWith('premier-admin-test-'));await rm(directory,{recursive:true,force:true});}
});
