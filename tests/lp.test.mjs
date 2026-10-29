import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {additionalPrices} from '../content/pricing.mjs';
import {doctors} from '../content/doctors.mjs';
import {clinic} from '../content/site.mjs';
import {reputation} from '../content/reputation.mjs';

const root = new URL('../', import.meta.url);
const pageUrl = new URL('lp/index.html', root);
const html = await readFile(pageUrl, 'utf8');
const css = await readFile(new URL('lp/lp.css', root), 'utf8');
const script = await readFile(new URL('lp/lp.js', root), 'utf8');
const prices = JSON.parse(script.match(/\/\*prices:start\*\/([\s\S]*?)\/\*prices:end\*\//)[1]);
const digits = value => Number(String(value).replace(/\D/g, ''));
const group = n => new Intl.NumberFormat('ru-RU').format(n).replace(/\s/g, '&#8239;');
const shown = n => `${group(n)}&nbsp;₽`;
const turnkey = sys => prices.implant[sys] + prices.parts[sys] + prices.crown;

test('landing prices: one source in lp.js, the same figures in the page text', () => {
  // Main offer: Osstem under the key — 55 500 ₽, immediate implantation — 65 000 ₽
  assert.equal(turnkey('osstem'), 55500);
  assert.equal(turnkey('osstem') + prices.immediate, 65000);
  assert.equal(prices.extraction, 0, 'extraction is free with implantation');
  for (const sys of ['osstem', 'dentium', 'astra']) {
    assert.ok(html.includes(shown(prices.implant[sys])), `implant price ${sys}`);
    assert.ok(html.includes(shown(turnkey(sys))), `turnkey price ${sys}`);
    assert.ok(html.includes(`<b>${prices.life[sys]}&nbsp;лет</b>`), `service life ${sys}`);
    const width = Math.round(prices.life[sys] / 30 * 1000) / 10;
    assert.ok(html.includes(`data-pick-implant="${sys}"`), `pick button ${sys}`);
    assert.ok(html.includes(`data-v="${width}"`), `life meter ${sys}`);
  }
  for (const value of [prices.crown, 65000, prices.allOn4From]) assert.ok(html.includes(shown(value)), `no ${value} on the page`);
  assert.ok(html.includes(`<td>${group(prices.parts.osstem)}</td>`), 'abutment and healing cap in the static spec');
  // The drawing in the hero adds up
  assert.match(html, /20&#8239;000&#160;₽[\s\S]*17&#8239;500&#160;₽[\s\S]*18&#8239;000&#160;₽[\s\S]*55&#8239;500&#160;₽/);
  // Extra services still come from the clinic brief
  const extra = Object.fromEntries(additionalPrices);
  for (const label of ['Консультация хирурга-имплантолога', 'Десневая пластика', 'Закрытый синус-лифтинг', 'Открытый синус-лифтинг', 'Анестезия']) {
    assert.ok(html.includes(group(digits(extra[label]))), `extra price for ${label}`);
  }
});

test('doubts block shows the four reasons with matching bars', () => {
  const reasons = [...html.matchAll(/<p class="doubt__pct"><span class="num">([\d,]+)<\/span>%<\/p>\s*<div class="meter"[^>]*><span class="meter__fill" data-v="([\d.]+)"><\/span><\/div>\s*<h3 class="doubt__title">([^<]+)<\/h3>/g)];
  assert.deepEqual(reasons.map(m => m[3].replace(/&nbsp;/g, ' ')), ['Высокая стоимость', 'Неуверенность в результате', 'Страх осложнений', 'Страх операции']);
  for (const [, label, width] of reasons) assert.equal(Number(label.replace(',', '.')), Number(width));
});

test('owner edits of 29.10: six advantages, All-on-6 without a price, flags, video slot, no free-replacement promise', () => {
  assert.equal((html.match(/<li class="adv__item">/g) || []).length, 6);
  assert.ok(html.includes('https://prodoctorov.ru/naberezhnye-chelny/vrach/235262-dmitriev/'), 'Dmitriev profile link');
  assert.ok(html.includes('src="../assets/doctor-tretyak-maxim.webp"'), 'anesthesiologist photo');
  const aon6 = html.match(/<li class="var var--wide" id="all-on-6">([\s\S]*?)<\/li>/)?.[1] || '';
  assert.ok(aon6.includes('All-on-6') && !aon6.includes('₽'), 'All-on-6 card has no price');
  assert.ok(html.includes('aria-label="Флаг Южной Кореи"') && html.includes('aria-label="Флаг Швеции"'));
  assert.ok(html.includes('id="video-lechenie"') && html.includes('id="video-lab"') && html.includes('data-play-video'));
  assert.doesNotMatch(html, /заменим[^<]*бесплатно/, 'owner asked not to promise a free replacement');
});

test('every bar width used in the page has a CSS rule (no inline styles under CSP)', () => {
  for (const [, value] of html.matchAll(/class="meter__fill" data-v="([\d.]+)"/g)) {
    assert.ok(css.includes(`.meter__fill[data-v="${value}"]`), `missing CSS width for ${value}`);
  }
});

test('landing shows the clinic data it promises: team in order, phone, address, rating, legal block', () => {
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.ok(html.includes(`href="tel:${clinic.phone}"`));
  assert.ok(html.includes(clinic.telephone));
  assert.ok(html.includes('Пушкина, 4 (45/05)'));
  for (const doctor of doctors) {
    const [surname, ...rest] = doctor.name.split(' ');
    assert.ok(html.includes(`<b>${surname}</b> ${rest.join(' ')}`), doctor.name);
    assert.ok(html.includes(`doctor-${doctor.slug}-400.webp`), doctor.slug);
  }
  // Order of the team block: surgeons → orthopedists → dental technician → anesthesiologist
  const order = ['Хирурги-имплантологи', 'Ортопеды', 'Зубной техник', 'Анестезиолог-реаниматолог'].map(title => html.indexOf(`<h3 class="crew__title">${title}</h3>`));
  assert.ok(order.every(i => i > 0) && order.every((i, k) => k === 0 || i > order[k - 1]), 'team groups are in the agreed order');
  const [techSurname, ...techRest] = clinic.laboratory.technician.name.split(' ');
  assert.ok(html.includes(`<b>${techSurname}</b> ${techRest.join(' ')}`));
  assert.ok(html.includes('<b>Третьяк</b> Максим Юрьевич'));
  assert.ok(html.includes('https://prodoctorov.ru/naberezhnye-chelny/vrach/290263-tretyak/'));
  assert.ok(html.includes(reputation.url));
  assert.ok(html.includes(reputation.rating) && html.includes(String(reputation.reviewCount)));
  assert.ok(html.includes(clinic.legalName));
  assert.match(html, /ИНН 1639015757/);
  assert.match(html, /Лицензия ЛО-16-01-003799/);
  assert.match(html, /Имеются противопоказания\. Необходима консультация специалиста\./);
});

test('landing works under the strict local CSP and links only to existing files', async () => {
  assert.doesNotMatch(html, /\sstyle="/, 'inline style attributes are blocked by CSP');
  assert.doesNotMatch(html, /\son[a-z]+="/, 'inline event handlers are blocked by CSP');
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, 'inline scripts are blocked by CSP');
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/, 'no external scripts or stylesheets');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const match of html.matchAll(/\s(?:href|src|srcset|poster)="([^"]+)"/g)) {
    for (const candidate of match[1].split(',').map(item => item.trim().split(/\s+/)[0])) {
      const target = candidate.replace(/&amp;/g, '&');
      if (/^(?:https?:|tel:|mailto:|data:)/.test(target)) continue;
      if (target.startsWith('#')) { assert.ok(ids.has(target.slice(1)), `missing anchor ${target}`); continue; }
      if (target === '../' || target === '../site-config.js') continue; // generated by the build
      assert.ok((await stat(new URL(target, pageUrl))).isFile(), `missing ${target}`);
    }
  }
});

test('production build copies the landing and runs the draft guard on it', async () => {
  const build = await readFile(new URL('scripts/build-pages.mjs', root), 'utf8');
  assert.match(build, /const landingFiles = \['lp\/index\.html'\]/);
  assert.match(build, /\[\.\.\.htmlFiles,\.\.\.landingFiles\]/);
  assert.match(build, /cp\(new URL\('lp\/',root\)/);
});
