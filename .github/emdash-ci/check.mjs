// Проверка EmDash-версии лендинга на запущенном `astro dev` (http://127.0.0.1:4321).
// 1) демо-контент применяется, 2) главная отдаётся с ценами из CMS, 3) правка цены через CLI EmDash
// сразу видна на сайте, 4) калькулятор и окно записи работают, 5) скриншоты сайта и админки.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4321';
const ROOT = resolve(process.cwd());
const SITE = join(ROOT, 'emdash');
const OUT = join(ROOT, 'ci-report');
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, pass, info = '') => {
  results.push({ name, pass: Boolean(pass), info: String(info).slice(0, 400) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? ` — ${info}` : ''}`);
  return Boolean(pass);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#8239;/g, ' ')
  .replace(/[  ]/g, ' ')
  .replace(/\s+/g, ' ');

async function waitForServer(ms) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    try {
      const res = await fetch(`${BASE}/assets/favicon.svg`);
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
}

function cli(args) {
  const res = spawnSync('npx', ['--no-install', 'emdash', ...args, '--url', BASE, '--token', TOKEN, '--json'], {
    cwd: SITE, encoding: 'utf8', timeout: 120000,
  });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}
const findKey = (obj, key) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const value of Object.values(obj)) {
    const found = findKey(value, key);
    if (found !== undefined) return found;
  }
  return undefined;
};

let TOKEN = '';
const IMPLANT_FIELDS = ['name', 'country', 'implant_price', 'parts_price', 'service_life', 'note', 'featured', 'price_from', 'sort_order'];

async function main() {
  check('dev-сервер запустился', await waitForServer(180000));

  // Применяем seed с демо-контентом и получаем токен (только в dev).
  let bypassJson = null;
  for (let attempt = 1; attempt <= 3 && !TOKEN; attempt++) {
    const res = await fetch(`${BASE}/_emdash/api/setup/dev-bypass?token=1`);
    const body = await res.text();
    writeFileSync(join(OUT, `setup-dev-bypass-${attempt}.json`), body);
    try { bypassJson = JSON.parse(body); } catch { bypassJson = null; }
    TOKEN = findKey(bypassJson, 'token') || '';
    if (!TOKEN) await sleep(3000);
  }
  check('seed применён, dev-админ создан (dev-bypass)', TOKEN, TOKEN ? 'токен получен' : JSON.stringify(bypassJson)?.slice(0, 300));

  const home = await fetch(`${BASE}/`);
  const html = await home.text();
  writeFileSync(join(OUT, 'home.html'), html);
  const t = text(html);
  check('главная отдаётся', home.status === 200, `HTTP ${home.status}`);
  const expect = [
    ['оффер: зуб под ключ', 'Зуб на импланте за 55 500 ₽'],
    ['одномоментная = зуб + доплата', '65 000 ₽'],
    ['All-on-4 от', 'от 300 000 ₽'],
    ['заголовок сравнения из цен имплантов', 'Чем отличаются импланты за 18, 30 и 66 тысяч'],
    ['Dentium под ключ «от»', 'от 67 500 ₽'],
    ['Astra Tech под ключ «от»', 'от 103 500 ₽'],
    ['коронка из «Клиники»', '20 000 ₽'],
    ['врачи из коллекции', 'Шарифуллин Руслан Рушанович'],
    ['анестезиолог', 'Третьяк Максим Юрьевич'],
    ['рейтинг и отзывы', 'рейтинг 5,0 на ПроДокторов по 344 отзывам'],
    ['FAQ с токеном', 'Что входит в 55 500 ₽?'],
    ['контакты', 'ул. Пушкина, 4 (45/05)'],
    ['подвал', 'ИНН 1639015757'],
  ];
  for (const [name, needle] of expect) check(`текст: ${name}`, t.includes(needle), needle);
  const leftovers = t.match(/\{[\p{L}\p{N}-]+\}/gu) || [];
  check('нет неподставленных токенов', leftovers.length === 0, leftovers.join(' '));
  check('нет «заменим бесплатно»', !/заменим бесплатно/i.test(t));
  check('калькулятор получил цены', html.includes('data-calc-data'));
  check('посетители не видят разметку правки', !/\sdata-pe(-info|-open)?=/.test(html) && !html.includes('class="pe-bar"') && !html.includes('.pe-pop'));
  check('noindex для черновика', /<meta[^>]+name="robots"[^>]+noindex|<meta[^>]+noindex[^>]+name="robots"/.test(html));
  check('секций на странице ≥ 14', (html.match(/<section\b/g) || []).length >= 14, (html.match(/<section\b/g) || []).length);

  const homeAlias = await fetch(`${BASE}/home`, { redirect: 'manual' });
  check('/home ведёт на главную (301)', homeAlias.status === 301 && homeAlias.headers.get('location')?.endsWith('/'), `HTTP ${homeAlias.status} → ${homeAlias.headers.get('location')}`);
  const missing = await fetch(`${BASE}/net-takoy-stranicy`);
  check('несуществующая страница — 404', missing.status === 404, `HTTP ${missing.status}`);

  // Браузер: скриншоты, калькулятор, окно записи, ширина на телефоне.
  const browser = await chromium.launch();
  const problems = [];
  for (const [label, width, height] of [['390', 390, 844], ['1440', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('console', msg => { if (msg.type() === 'error') problems.push(`[${label}] console: ${msg.text()}`); });
    page.on('pageerror', err => problems.push(`[${label}] pageerror: ${err.message}`));
    page.on('response', res => { if (res.status() >= 400) problems.push(`[${label}] HTTP ${res.status()} ${res.url()}`); });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
      document.querySelectorAll('.sheet, [data-live]').forEach(el => el.classList.add('is-live'));
    });
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
      await Promise.all([...document.images].map(img => img.complete ? null : new Promise(done => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 20000);
      })));
    });
    // Полностраничный снимок рисует только уже декодированные картинки — декодируем и прокручиваем ещё раз
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    const images = await page.evaluate(() => [...document.images].map(img => ({
      alt: img.alt, src: img.currentSrc || img.src, natural: `${img.naturalWidth}x${img.naturalHeight}`,
      box: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`,
    })));
    writeFileSync(join(OUT, `images-${label}.json`), JSON.stringify(images, null, 2));
    const broken = images.filter(img => img.natural.startsWith('0x')).map(img => img.src);
    check(`все картинки загрузились (${label}px)`, broken.length === 0, broken.slice(0, 3).join(' '));
    await page.waitForTimeout(3200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`нет горизонтальной прокрутки (${label}px)`, overflow <= 0, `лишние ${overflow}px`);
    await page.screenshot({ path: join(OUT, `site-${label}.jpg`), fullPage: true, type: 'jpeg', quality: 72 });
    await page.screenshot({ path: join(OUT, `site-${label}-first-screen.png`), fullPage: false });
    const crew = page.locator('.crew').first();
    if (await crew.count()) {
      await crew.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await crew.screenshot({ path: join(OUT, `team-${label}.png`) });
    }

    if (label === '390') {
      for (const w of [360, 320]) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.waitForTimeout(300);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(`нет горизонтальной прокрутки (${w}px)`, over <= 0, `лишние ${over}px`);
      }
      await page.setViewportSize({ width, height });
    }

    if (label === '1440') {
      const total = async () => (await page.locator('[data-total]').textContent()).replace(/[  ]/g, ' ');
      check('смета по умолчанию', (await total()) === '55 500 ₽', await total());
      await page.locator('[data-step="1"]').click();
      check('смета: 2 зуба', (await total()) === '111 000 ₽', await total());
      await page.locator('input[name="implant"][value="dentium"]').check();
      check('смета: 2 зуба на Dentium', (await total()) === '135 000 ₽', await total());
      await page.locator('input[name="immediate"]').check();
      check('смета: + одномоментно (и удаление)', (await total()) === '154 000 ₽', await total());
      await page.locator('#smeta').screenshot({ path: join(OUT, 'calc-1440.png') });
      await page.locator('.hero [data-book]').first().click();
      check('окно записи открывается', await page.locator('#book').evaluate(d => d.open));
      await page.screenshot({ path: join(OUT, 'booking-dialog-1440.png') });
    }
    await page.close();
  }
  check('нет ошибок в консоли и битых ресурсов', problems.length === 0, problems.slice(0, 8).join(' | '));
  writeFileSync(join(OUT, 'browser-problems.txt'), problems.join('\n'));

  // Правка в CMS → сайт: меняем цену Osstem через CLI EmDash (публикуется сразу).
  const got = cli(['content', 'get', 'implants', 'osstem']);
  writeFileSync(join(OUT, 'cli-get-osstem.json'), got.stdout + got.stderr);
  let item = null;
  try { item = JSON.parse(got.stdout); } catch {}
  const rev = findKey(item, '_rev');
  const data = item?.data || {};
  check('CLI: запись Osstem читается', got.status === 0 && rev && data.implant_price === 18000, `status ${got.status}, rev ${rev ? 'есть' : 'нет'}, цена ${data.implant_price}`);

  const edited = Object.fromEntries(IMPLANT_FIELDS.filter(k => k in data).map(k => [k, data[k]]));
  edited.implant_price = 19000;
  const upd = cli(['content', 'update', 'implants', 'osstem', '--rev', String(rev), '--data', JSON.stringify(edited)]);
  writeFileSync(join(OUT, 'cli-update-osstem.json'), upd.stdout + upd.stderr);
  check('CLI: цена Osstem изменена на 19 000 и опубликована', upd.status === 0, upd.stderr.slice(0, 300));

  await sleep(500);
  const after = text(await (await fetch(`${BASE}/`)).text());
  check('сайт после правки: зуб под ключ 56 500 ₽', after.includes('Зуб на импланте за 56 500 ₽'));
  check('сайт после правки: заголовок «за 19, 30 и 66 тысяч»', after.includes('за 19, 30 и 66 тысяч'));
  check('сайт после правки: одномоментная 66 000 ₽', after.includes('Одномоментная имплантация 66 000 ₽'));

  // Возвращаем цену, чтобы скриншоты админки показывали исходные данные.
  const again = cli(['content', 'get', 'implants', 'osstem']);
  let item2 = null;
  try { item2 = JSON.parse(again.stdout); } catch {}
  const back = cli(['content', 'update', 'implants', 'osstem', '--rev', String(findKey(item2, '_rev')), '--data', JSON.stringify({ ...edited, implant_price: 18000 })]);
  const restored = text(await (await fetch(`${BASE}/`)).text());
  check('цена возвращена: 55 500 ₽', back.status === 0 && restored.includes('Зуб на импланте за 55 500 ₽'));

  // Правка прямо на странице: вошедший редактор включает «Режим редактирования» (cookie emdash-edit-mode).
  const editorCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  const ed = await editorCtx.newPage();
  const edProblems = [];
  ed.on('pageerror', err => edProblems.push(`pageerror: ${err.message}`));
  ed.on('console', msg => { if (msg.type() === 'error') edProblems.push(`console: ${msg.text()}`); });
  await ed.goto(`${BASE}/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`, { waitUntil: 'networkidle' });
  await editorCtx.addCookies([{ name: 'emdash-edit-mode', value: 'true', url: BASE }]);
  let popups = 0;
  editorCtx.on('page', () => { popups += 1; });
  await ed.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  writeFileSync(join(OUT, 'edit-mode.html'), await ed.content());
  const refs = await ed.evaluate(() => [...document.querySelectorAll('[data-emdash-ref]')].map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${el.getAttribute('data-emdash-ref')}`));
  writeFileSync(join(OUT, 'edit-mode-refs.txt'), refs.join('\n'));
  const peCount = await ed.locator('[data-pe]').count();
  check('режим правки: редактируемых мест на странице', peCount > 60, peCount);
  check('режим правки: плашка-подсказка видна', await ed.locator('.pe-bar').isVisible());
  const area = ed.locator('.pe-pop textarea');
  const clickCentered = async locator => {
    await locator.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await ed.waitForTimeout(250);
    await locator.click();
  };
  const editText = async (locator, value) => {
    await clickCentered(locator);
    await area.waitFor({ timeout: 5000 });
    await area.fill(value);
    await area.press('Enter');
    await ed.locator('.pe-toast.is-on').waitFor({ timeout: 20000 });
    return (await ed.locator('.pe-toast').textContent()) || '';
  };
  const editAndReload = async (locator, value) => {
    await clickCentered(locator);
    await area.waitFor({ timeout: 5000 });
    await area.fill(value);
    await Promise.all([ed.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }), area.press('Enter')]);
  };
  try {
    const advTitle = ed.locator('.adv__item h3').first();
    const original = (await advTitle.getAttribute('data-pe')) ? JSON.parse(await advTitle.getAttribute('data-pe')).r : '';
    await clickCentered(advTitle);
    await area.waitFor({ timeout: 5000 });
    await ed.screenshot({ path: join(OUT, 'edit-mode-1440.png') });
    await area.fill('С 1999 года — правка на странице');
    await area.press('Enter');
    await ed.locator('.pe-toast.is-on').waitFor({ timeout: 20000 });
    const toastText = (await ed.locator('.pe-toast').textContent()) || '';
    check('правка текста: сохранено и опубликовано', /Сохранено/.test(toastText), toastText);
    check('правка текста: на странице новый текст', ((await advTitle.textContent()) || '').replace(/[\u00A0\u202F]/g, ' ').includes('правка на странице'));
    const anon = text(await (await fetch(`${BASE}/`)).text());
    check('правка текста видна посетителям', anon.includes('С 1999 года — правка на странице'));

    await editAndReload(ed.locator('.sys dd[data-pe]').first(), '19000');
    const anon2 = text(await (await fetch(`${BASE}/`)).text());
    check('правка цены на странице пересчитала «зуб под ключ»', anon2.includes('Зуб на импланте за 56 500 ₽'));

    await editAndReload(ed.locator('.contact__list dd span[data-pe]').nth(1), 'Пн–Пт 09:00–21:00');
    const anon3 = text(await (await fetch(`${BASE}/`)).text());
    check('правка строки часов работы', anon3.includes('Пн–Пт 09:00–21:00') && anon3.includes('Сб 08:00–14:00'));

    const faq = await editText(ed.locator('.qa summary span[data-pe]').nth(1), 'Чем Osstem отличается от Dentium и Astra Tech? (правка)');
    check('правка вопроса в FAQ', /Сохранено/.test(faq), faq);

    // Возвращаем как было
    await editText(ed.locator('.adv__item h3').first(), original || 'С 1999 года');
    await editAndReload(ed.locator('.sys dd[data-pe]').first(), '18000');
    await editAndReload(ed.locator('.contact__list dd span[data-pe]').nth(1), 'Пн–Пт 08:00–20:00');
    await editText(ed.locator('.qa summary span[data-pe]').nth(1), 'Чем Osstem отличается от Dentium и Astra Tech?');
    const back = text(await (await fetch(`${BASE}/`)).text());
    check('после отката всё как было', back.includes('Зуб на импланте за 55 500 ₽') && back.includes('Пн–Пт 08:00–20:00') && !back.includes('правка на странице'));
  } catch (error) {
    check('правка на странице прошла без исключений', false, error?.message || error);
    await ed.screenshot({ path: join(OUT, 'edit-mode-error.png') }).catch(() => {});
  }
  try {
    await ed.setViewportSize({ width: 390, height: 844 });
    await ed.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await clickCentered(ed.locator('.var__title').first());
    await area.waitFor({ timeout: 5000 });
    await ed.screenshot({ path: join(OUT, 'edit-mode-390.png') });
    await area.press('Escape');
    const over = await ed.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('режим правки на телефоне: без горизонтальной прокрутки', over <= 0, `лишние ${over}px`);
  } catch (error) {
    check('режим правки на телефоне', false, error?.message || error);
  }
  check('режим правки: клики не открывают лишних вкладок', popups === 0, `открыто ${popups}`);
  check('режим правки: без ошибок в консоли', edProblems.length === 0, edProblems.slice(0, 5).join(' | '));
  await editorCtx.close();

  // Админка: вход через dev-bypass, скриншоты разделов.
  const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  const dismissWelcome = async () => {
    const button = admin.getByRole('button', { name: /^(Начать|Get started)$/ });
    if (await button.count()) { await button.first().click().catch(() => {}); await admin.waitForTimeout(600); }
  };
  await admin.goto(`${BASE}/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(2500);
  await dismissWelcome();
  await admin.screenshot({ path: join(OUT, 'admin-dashboard.png') });
  const pagesList = cli(['content', 'list', 'pages']);
  writeFileSync(join(OUT, 'cli-list-pages.json'), pagesList.stdout + pagesList.stderr);
  const homeItem = cli(['content', 'get', 'pages', 'home', '--raw']);
  let homeJson = null;
  try { homeJson = JSON.parse(homeItem.stdout); } catch {}
  const homeId = homeJson?.id;
  const clinicItem = cli(['content', 'get', 'clinic', 'main']);
  let clinicJson = null;
  try { clinicJson = JSON.parse(clinicItem.stdout); } catch {}
  const shots = [
    ['admin-pages', '/_emdash/admin/content/pages'],
    ['admin-home-editor', homeId ? `/_emdash/admin/content/pages/${homeId}` : null],
    ['admin-clinic-editor', clinicJson?.id ? `/_emdash/admin/content/clinic/${clinicJson.id}` : null],
    ['admin-implants', '/_emdash/admin/content/implants'],
    ['admin-doctors', '/_emdash/admin/content/doctors'],
  ];
  for (const [name, path] of shots) {
    if (!path) { check(`админка: ${name}`, false, 'нет id записи'); continue; }
    const res = await admin.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(2500);
    await dismissWelcome();
    check(`админка: ${name}`, res && res.status() < 400, `HTTP ${res?.status()}`);
    await admin.screenshot({ path: join(OUT, `${name}.png`), fullPage: name.endsWith('editor') });
  }
  await browser.close();
}

try {
  await main();
} catch (error) {
  check('проверка завершилась без исключений', false, error?.stack || error);
}
const failed = results.filter(r => !r.pass);
const lines = [
  `# EmDash check — ${failed.length ? `${failed.length} FAIL` : 'all PASS'}`,
  '',
  '| | Проверка | Детали |',
  '|---|---|---|',
  ...results.map(r => `| ${r.pass ? '✅' : '❌'} | ${r.name} | ${r.info.replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
];
writeFileSync(join(OUT, 'summary.md'), lines.join('\n') + '\n');
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
