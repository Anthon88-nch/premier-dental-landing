import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {publicPageFiles,pagePath} from '../scripts/public-pages.mjs';
import {applySeo,crawlFiles} from '../scripts/seo.mjs';
import {seoConfig,clinic} from '../content/site.mjs';
import {articles} from '../content/blog.mjs';
const root = new URL('../',import.meta.url);
const decode = value => value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const graph = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');

test('all public pages have unique metadata, valid linked data and working internal anchors',async()=>{
  assert.equal(articles.length,6);
  const titles = new Set(), descriptions = new Set();
  for(const file of publicPageFiles) {
    const url = new URL(file,root),html=await readFile(url,'utf8');
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file);
    const title=html.match(/<title>(.*?)<\/title>/s)?.[1],description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && !titles.has(title),`Duplicate/empty title: ${file}`);titles.add(title);
    assert.ok(description && !descriptions.has(description),`Duplicate/empty description: ${file}`);descriptions.add(description);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1,file);
    assert.ok(html.includes(`rel="canonical" href="${new URL(pagePath(file),seoConfig().url).href}"`),file);
    const data=graph(html);assert.equal(data['@context'],'https://schema.org');
    assert.equal(data['@graph'].filter(n=>n['@type']==='Dentist').length,1);
    assert.doesNotMatch(JSON.stringify(data),/AggregateRating|reviewedBy|speakable/);
    for(const faq of data['@graph'].filter(n=>n['@type']==='FAQPage'))for(const q of faq.mainEntity) {
      assert.ok(html.includes(q.name),`${file}: FAQ question missing from visible HTML`);
      assert.ok(html.includes(q.acceptedAnswer.text),`${file}: FAQ answer missing from visible HTML`);
    }
    for(const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const target=decode(match[1]);
      if(/^(https?:|tel:|mailto:|data:)/.test(target))continue;
      const resolved=new URL(target,url),id=decodeURIComponent(resolved.hash.slice(1));resolved.hash='';
      if(resolved.pathname.endsWith('/'))resolved.pathname+='index.html';
      assert.ok((await stat(resolved)).isFile(),`${file}: missing ${target}`);
      if(id && resolved.pathname.endsWith('.html')) {
        const linked=await readFile(resolved,'utf8');
        assert.ok(linked.includes(`id="${id}"`) || linked.includes(`id='${id}'`),`${file}: missing anchor ${target}`);
      }
    }
  }
});

test('production and preview crawl directives are deliberate and support subdirectory hosting',async()=>{
  const preview=seoConfig(),production=seoConfig({SITE_URL:clinic.primaryUrl,SITE_INDEXABLE:'true'});
  assert.throws(()=>seoConfig({SITE_INDEXABLE:'true'}));
  for(const invalid of ['http://example.ru/','https://example.ru/?secret=x','https://user:pass@example.ru/'])assert.throws(()=>seoConfig({SITE_URL:invalid}));
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.match(applySeo(html,'index.html',preview),/noindex,nofollow/);
  assert.match(applySeo(html,'index.html',production),/index,follow,max-image-preview:large/);
  assert.equal(applySeo(html,'index.html',preview),applySeo(applySeo(html,'index.html',preview),'index.html',preview));
  const {robots,sitemap}=crawlFiles(production);
  assert.doesNotMatch(robots,/Disallow: \/\n/);assert.match(robots,/Disallow: \/admin\//);
  assert.equal((sitemap.match(/<loc>/g)||[]).length,publicPageFiles.length);
  assert.doesNotMatch(sitemap,/admin|api\/|research|\.env/);
  assert.match(crawlFiles(preview).robots,/Disallow: \/\n/);
  const sub=seoConfig({SITE_URL:'https://example.ru/clinic/',SITE_INDEXABLE:'true'});
  assert.ok(crawlFiles(sub).sitemap.includes('https://example.ru/clinic/blog/'));
  assert.ok(applySeo(html,'blog/index.html',sub).includes('https://example.ru/clinic/blog/'));
});

test('medical articles disclose editorial authorship, sources and verified related services',async()=>{
  for(const a of articles) {
    const html=await readFile(new URL(`blog/${a.slug}/index.html`,root),'utf8');
    assert.ok(html.includes(clinic.editor));
    assert.ok(a.sources.length>=1,`${a.slug}: sources`);
    const posting=graph(html)['@graph'].find(n=>n['@type']==='BlogPosting');
    assert.equal(posting.headline,a.heading);assert.ok(posting.datePublished.startsWith(a.datePublished));
    assert.deepEqual(posting.citation,a.sources.map(s=>s.url));
    for(const s of a.sources)assert.ok(html.includes(s.url),`${a.slug}: visible citation`);
    assert.match(html,/не заменяет консультацию/);
  }
});
