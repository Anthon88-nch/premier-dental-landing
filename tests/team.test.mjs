import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {doctors} from '../content/doctors.mjs';
import {laboratoryPhotos} from '../content/laboratory.mjs';
const root=new URL('../',import.meta.url);
test('doctor identities, specialties and pictures remain consistent across pages',async()=>{
  assert.equal(doctors.length,5);
  assert.equal(new Set(doctors.map(d=>d.name)).size,5);
  for(const group of ['implantology','orthopedics'])assert.equal(doctors.filter(d=>d.groups.includes(group)).length,3);
  const directory=await readFile(new URL('doctors/index.html',root),'utf8');
  const graph=JSON.parse(directory.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(graph['@graph'].filter(n=>n['@type']==='Person').length,5);
  for(const d of doctors) {
    assert.ok(directory.includes(`id="${d.slug}"`));assert.ok(directory.includes(d.image));assert.ok(directory.includes(d.experience));
    assert.ok((await stat(new URL(d.image,root))).size<150000);
    assert.ok((await stat(new URL(d.image.replace('.webp','-400.webp'),root))).size>0);
  }
  for(const [file,group] of [['index.html','implantology'],['services/ortoped/index.html','orthopedics']]) {
    const html=await readFile(new URL(file,root),'utf8');
    for(const d of doctors.filter(d=>d.groups.includes(group)))assert.ok(html.includes(d.image),`${file}: ${d.name}`);
  }
});
test('laboratory photos and named technician are rendered without a technician booking CTA',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  for(const p of laboratoryPhotos)assert.ok(html.includes(p.image));
  assert.match(html,/Новиков Павел Сергеевич/);
  assert.doesNotMatch(html,/data-book="[^"]*Новиков/);
  assert.match(html,/<video[^>]+preload="none"/);
  assert.doesNotMatch(html,/<video[^>]+autoplay/);
});
