import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicPageFiles} from '../scripts/public-pages.mjs';

const root = new URL('../', import.meta.url);
const baseline = JSON.parse(await readFile(new URL('fixtures/cro-baseline.json', import.meta.url), 'utf8'));
const readPage = file => readFile(new URL(file, root), 'utf8');
const match = (html, pattern) => html.match(pattern)?.[0] ?? null;
const attributes = tag => Object.fromEntries([...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
  .map(([, key, double, single, bare]) => [key.toLowerCase(), double ?? single ?? bare ?? true]));

const preserved = html => ({
  h1: match(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/),
  title: match(html, /<title>[\s\S]*?<\/title>/),
  description: match(html, /<meta name="description"[^>]*>/),
  canonical: match(html, /<link rel="canonical"[^>]*>/),
  structuredData: JSON.stringify(JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null')),
  privacy: match(html, /<dialog id="privacy"[^>]*>[\s\S]*?<\/dialog>/),
  footerLegal: match(html, /<div class="footer-legal">[\s\S]*?<\/div>/),
  medicalNote: match(html, /<p class="medical-note">[\s\S]*?<\/p>/),
  footerSmall: match(html, /<p class="footer-small">[\s\S]*?<\/p>/),
  consent: match(html, /<label class="consent">[\s\S]*?<\/label>/)
});

test('CRO changes preserve the 17 existing pages, metadata, linked data and legal copy', async () => {
  assert.equal(publicPageFiles.length, 17);
  assert.deepEqual(Object.keys(baseline).sort(), [...publicPageFiles].sort());
  for (const file of publicPageFiles) {
    const html = await readPage(file);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${file}: exactly one H1`);
    assert.equal((html.match(/<title>/g) ?? []).length, 1, `${file}: exactly one title`);
    assert.equal((html.match(/<meta name="description"/g) ?? []).length, 1, `${file}: exactly one description`);
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, `${file}: exactly one canonical`);
    assert.equal((html.match(/type="application\/ld\+json"/g) ?? []).length, 1, `${file}: exactly one linked-data graph`);
    const actual = preserved(html);
    for (const [field, expected] of Object.entries(baseline[file])) {
      assert.ok(expected, `${file}: baseline ${field} is not empty`);
      assert.equal(actual[field], expected, `${file}: ${field} changed during CRO work`);
    }
  }
});

test('public booking forms stay short, require consent and retain the shared mobile call and booking controls', async () => {
  for (const file of publicPageFiles) {
    const html = await readPage(file);
    const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(m => m[0]);
    assert.equal(forms.length, 1, `${file}: one shared public booking form`);
    const form = forms[0];
    assert.match(form, /id="booking-form"/, file);
    const withoutHoneypot = form.replace(/<div\b[^>]*class="[^"]*\bhoneypot\b[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
    const fields = [...withoutHoneypot.matchAll(/<(?:input|textarea)\b[^>]*>/g)].map(m => attributes(m[0]))
      .filter(a => !['hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'image'].includes(a.type));
    assert.ok(fields.length >= 1 && fields.length <= 2, `${file}: no more than two visible text fields`);
    const phone = fields.find(a => a.type === 'tel');
    assert.ok(phone, `${file}: telephone field exists`);
    assert.equal(phone.name, 'phone', file);
    assert.equal(phone.required, true, `${file}: telephone is required`);
    assert.equal(phone.autocomplete, 'tel', file);
    assert.equal(phone.inputmode, 'tel', file);
    const consent = [...form.matchAll(/<input\b[^>]*>/g)].map(m => attributes(m[0])).find(a => a.name === 'consent');
    assert.equal(consent?.type, 'checkbox', `${file}: explicit consent checkbox`);
    assert.equal(consent.required, true, `${file}: consent required`);
    assert.equal(consent.checked, undefined, `${file}: consent is not selected in advance`);
    const mobileBar = match(html, /<div\b[^>]*class="[^"]*\bmobile-bar\b[^"]*"[^>]*>[\s\S]*?<\/div>/);
    assert.ok(mobileBar, `${file}: shared mobile controls`);
    assert.match(mobileBar, /href="tel:\+78552529090"/, `${file}: current clinic telephone`);
    assert.match(mobileBar, /<button\b[^>]*data-book(?:=|\s|>)/, `${file}: booking is available from the mobile bar`);
  }
});

test('public scripts are deferred and raster images reserve space without eagerly loading below-the-fold content', async () => {
  for (const file of publicPageFiles) {
    const html = await readPage(file);
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(m => attributes(m[0])).filter(a => a.src);
    const analytics = scripts.filter(a => /(?:^|\/)analytics\.js$/.test(a.src));
    assert.equal(analytics.length, 1, `${file}: one shared analytics entry point`);
    assert.equal(analytics[0].defer, true, `${file}: analytics does not block parsing`);
    for (const script of scripts) assert.ok(script.defer || script.async || script.type === 'module', `${file}: parser-blocking ${script.src}`);
    for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
      const image = attributes(tag[0]);
      assert.ok(Number(image.width) > 0 && Number(image.height) > 0, `${file}: intrinsic dimensions for ${image.src}`);
      if (/\.svg(?:[?#]|$)/i.test(image.src)) continue;
      const isLcpHero = /\bhero-doctor\b/.test(image.class ?? '');
      if (isLcpHero) {
        assert.notEqual(image.loading, 'lazy', `${file}: primary hero image loads immediately`);
        assert.equal(image.fetchpriority, 'high', `${file}: primary hero image priority`);
      } else {
        assert.equal(image.loading, 'lazy', `${file}: defer non-hero raster ${image.src}`);
      }
      if (image.srcset) assert.ok(image.sizes, `${file}: responsive image has sizes`);
    }
    for (const tag of html.matchAll(/<video\b[^>]*>/g)) {
      const video = attributes(tag[0]);
      assert.equal(video.preload, 'none', `${file}: laboratory video is not downloaded on page load`);
      assert.equal(video.autoplay, undefined, `${file}: video starts only at user request`);
    }
  }
});
