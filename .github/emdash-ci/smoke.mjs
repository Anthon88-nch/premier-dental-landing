// Короткая проверка запуска (для Windows): сайт поднимается, демо-контент применяется,
// главная и админка отвечают, картинки из медиатеки отдаются.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4321';
const OUT = process.env.REPORT_DIR || 'win-report';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, pass, info = '') => {
  results.push({ name, pass: Boolean(pass), info: String(info).slice(0, 300) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? ` — ${info}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = html => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');

try {
  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    try { up = (await fetch(`${BASE}/assets/favicon.svg`)).ok; } catch {}
    if (!up) await sleep(2000);
  }
  check('dev-сервер запустился', up, BASE);

  const bypass = await fetch(`${BASE}/_emdash/api/setup/dev-bypass?token=1`);
  const bypassBody = await bypass.text();
  writeFileSync(join(OUT, 'setup-dev-bypass.json'), bypassBody);
  check('демо-контент применён (dev-bypass)', bypass.ok && bypassBody.includes('token'), `HTTP ${bypass.status}`);

  const home = await fetch(`${BASE}/`);
  const html = await home.text();
  writeFileSync(join(OUT, 'home.html'), html);
  const t = text(html);
  check('главная отдаётся', home.status === 200, `HTTP ${home.status}`);
  check('цена из CMS на месте', t.includes('Зуб на импланте за 55 500 ₽'));
  check('врачи из CMS на месте', t.includes('Третьяк Максим Юрьевич'));
  check('нет неподставленных токенов', !/\{[\p{L}\p{N}-]+\}/u.test(t));

  const admin = await fetch(`${BASE}/_emdash/admin`, { redirect: 'manual' });
  check('админка отвечает', [200, 301, 302, 303, 307].includes(admin.status), `HTTP ${admin.status} ${admin.headers.get('location') || ''}`);

  const img = html.match(/<img[^>]+src="(\/_image\?[^"]+|\/_emdash\/api\/media\/file\/[^"]+)"/);
  if (img) {
    const res = await fetch(BASE + img[1].replace(/&amp;/g, '&'));
    check('картинка из медиатеки отдаётся', res.ok && /^image\//.test(res.headers.get('content-type') || ''), `HTTP ${res.status} ${res.headers.get('content-type')}`);
  } else {
    check('картинка из медиатеки отдаётся', false, 'на странице нет картинок из медиатеки');
  }
} catch (error) {
  check('проверка без исключений', false, error?.stack || error);
}
const failed = results.filter(r => !r.pass);
writeFileSync(join(OUT, 'summary.md'), [
  `# Windows smoke — ${failed.length ? `${failed.length} FAIL` : 'all PASS'}`, '',
  ...results.map(r => `- ${r.pass ? '✅' : '❌'} ${r.name}${r.info ? ` — ${r.info}` : ''}`),
].join('\n') + '\n');
process.exit(failed.length ? 1 : 0);
