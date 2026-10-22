import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pages} from '../content/services.mjs';
import {articles} from '../content/blog.mjs';

test('public files, protected storage, validation, idempotent lead submission',async()=>{
  const directory = await mkdtemp(path.join(tmpdir(),'premier-test-'));
  const child = spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4174',HOST:'127.0.0.1',LEAD_DATA_DIR:directory,LEAD_WEBHOOK_URL:''},stdio:['ignore','pipe','pipe']});
  try {
    await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error(`Server exited: ${code}`)));});
    const base = 'http://127.0.0.1:4174';
    const post = (body,origin=base)=>fetch(base+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
    const homepage = await fetch(base);
    const csp = homepage.headers.get('content-security-policy');
    assert.match(csp,/connect-src 'self'/,'booking fetch must remain same-origin allowed alongside the widget');
    assert.match(csp,/script-src[^;]+https:\/\/mc\.yandex\.ru/,'public analytics script allowed');
    const analytics = await fetch(base+'/analytics.js');assert.equal(analytics.status,200);assert.match(analytics.headers.get('content-type'),/javascript/);
    const privateCsp=(await fetch(base+'/admin/')).headers.get('content-security-policy');assert.doesNotMatch(privateCsp,/mc\.yandex/,'admin keeps its private content policy'); assert.equal(homepage.status,200);assert.match(await homepage.text(),/<h1 id="hero-title">Имплантация зубов/);
    for(const route of ['/services/','/reviews/','/blog/','/doctors/',...pages.map(page=>`/services/${page.slug}/`),...articles.map(a=>`/blog/${a.slug}/`)]) {
      const response = await fetch(base+route);
      assert.equal(response.status,200,route);
      const html = await response.text();
      assert.equal((html.match(/<h1[ >]/g)||[]).length,1,route);
      assert.match(html,/id="booking-form"/);
      assert.match(html,/noindex,nofollow/);
    }
    const redirect = await fetch(base+'/services/all-on-4',{redirect:'manual'});
    assert.equal(redirect.status,308);
    assert.equal(redirect.headers.get('location'),'/services/all-on-4/');
    const articleRedirect = await fetch(base+`/blog/${articles[0].slug}`,{redirect:'manual'});
    assert.equal(articleRedirect.status,308);
    const sitemap = await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/xml/);
    const robots = await fetch(base+'/robots.txt');assert.equal(robots.status,200);assert.match(await robots.text(),/Disallow: \//);
    const video=await fetch(base+'/assets/lab-work.mp4',{headers:{Range:'bytes=0-31'}});
    assert.equal(video.status,206);assert.equal(video.headers.get('content-type'),'video/mp4');assert.equal((await video.arrayBuffer()).byteLength,32);assert.match(video.headers.get('content-range'),/^bytes 0-31\/\d+$/);
    const invalidRange=await fetch(base+'/assets/lab-work.mp4',{headers:{Range:'bytes=10-0'}});assert.equal(invalidRange.status,416);
    for(const route of ['/services/unknown/','/content/services.mjs','/services/data/test.json']) assert.equal((await fetch(base+route)).status,404);
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
