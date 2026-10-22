import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {pages} from '../content/services.mjs';
import {pricePlans,orthopedicPrices} from '../content/pricing.mjs';

test('brief price totals match components and are rendered on the correct pages',async()=>{
  const orthopedicHtml = await readFile(new URL('../services/ortoped/index.html',import.meta.url),'utf8');
  for(const [name,value] of orthopedicPrices) {
    assert.ok(orthopedicHtml.includes(name));
    assert.ok(orthopedicHtml.includes(new Intl.NumberFormat('ru-RU').format(value)+' ₽'));
  }
  assert.match(orthopedicHtml,/установка имплантатов в неё не входит/);
  assert.doesNotMatch(orthopedicHtml,/<h3>Установка имплантатов<\/h3>/);
  for(const [slug,plans] of Object.entries(pricePlans)) {
    const html = await readFile(new URL(`../services/${slug}/index.html`,import.meta.url),'utf8');
    for(const plan of plans) {
      assert.equal(plan.rows.reduce((sum,row)=>sum+row[1],0),plan.total,plan.name);
      assert.ok(html.includes(new Intl.NumberFormat('ru-RU').format(plan.total)+' ₽'),plan.name);
    }
    assert.match(html,/id="prices"/);
    assert.match(html,/Цены указаны без скидок/);
  }
});

test('generated pages have unique metadata, working local links and shared booking controls',async()=>{
  const root = new URL('../',import.meta.url);
  const files = ['reviews/index.html','services/index.html',...pages.map(p=>`services/${p.slug}/index.html`)];
  const titles = new Set();
  for(const file of files) {
    const url = new URL(file,root);
    const html = await readFile(url,'utf8');
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    assert.ok(title);assert.ok(!titles.has(title));titles.add(title);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
    assert.match(html,/class="service-page"/);
    for(const match of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
      const target = match[1];
      if(/^(https?:|tel:|mailto:)/.test(target))continue;
      const resolved = new URL(target,url);
      resolved.hash='';
      if(resolved.pathname.endsWith('/'))resolved.pathname+='index.html';
      assert.ok((await stat(resolved)).isFile(),`${file}: ${target}`);
    }
  }
});
