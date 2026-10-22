import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {articleCards} from './blog-markup.mjs';
import {articles} from '../content/blog.mjs';
import {pages} from '../content/services.mjs';
import {clinic} from '../content/site.mjs';
import {pageShell,escapeHtml as e,headingHtml} from './page-shell.mjs';
import {conversionCta} from './conversion-markup.mjs';
const root = new URL('../',import.meta.url);
const home = await readFile(new URL('index.html',root),'utf8');
const dateLabel = date => new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(date+'T12:00:00Z'));
const crumbs = a => `<nav class="breadcrumbs wrap" aria-label="Хлебные крошки"><a href="${a?'../../':'../'}index.html">Главная</a><span aria-hidden="true">/</span>${a?`<a href="../">Блог</a><span aria-hidden="true">/</span><span aria-current="page">${e(a.heading)}</span>`:'<span aria-current="page">Блог</span>'}</nav>`;
const articleSections = a => {
  const splitAfter = {
    'implantaciya-srazu-posle-udaleniya':'vremennaya-koronka',
    'all-on-4-ili-all-on-6':'stoimost',
    'iz-chego-skladyvaetsya-stoimost-implantacii':'dopolnitelnye-procedury',
    'etapy-i-sroki-implantacii-zuba':'koronka',
    'uhod-posle-implantacii-zubov':'osmotry'
  }[a.slug];
  // Keep urgent symptoms and emergency instructions together without a sales interruption.
  return a.sections.map(s=>`<section class="article-section" id="${s.id}"><h2>${headingHtml(s.title)}</h2>${s.html}</section>${s.id===splitAfter?`<div class="article-section article-booking">${conversionCta('../../')}</div>`:''}`).join('');
};
await mkdir(new URL('blog/',root),{recursive:true});
const hub = `${crumbs()}<section class="service-hub-hero wrap"><p class="eyebrow">БЛОГ PREMIER</p><h1>Статьи <em>об имплантации.</em></h1><p class="service-lead">Когда можно поставить имплантат, сколько длится лечение и как ухаживать за зубами после операции.</p>${conversionCta('../')}</section><section class="service-section wrap" aria-label="Статьи об имплантации">${articleCards(articles,'../')}${conversionCta('../')}</section>`;
await writeFile(new URL('blog/index.html',root),pageShell(home,'Блог об имплантации зубов — статьи для пациентов | Премьер','Этапы и сроки имплантации, All-on-4 и All-on-6, стоимость, выбор системы и уход за имплантатами. Статьи для пациентов со ссылками на медицинские источники.',hub,'../',{article:true}));
for(const a of articles) {
  const body = `${crumbs(a)}<article class="article-wrap wrap"><header class="article-header"><p class="eyebrow">${e(a.category)}</p><h1>${headingHtml(a.heading)}</h1><p class="article-meta">${e(clinic.editor)}<span aria-hidden="true"> · </span><time datetime="${a.datePublished}">${dateLabel(a.datePublished)}</time><span aria-hidden="true"> · </span>${a.readMinutes} мин чтения</p></header><div class="article-layout"><aside class="article-toc"><nav aria-label="Содержание статьи"><p>В этой статье</p><ol>${a.sections.map(s=>`<li><a href="#${s.id}">${e(s.title.replace(/^\d+\.\s+/,''))}</a></li>`).join('')}<li><a href="#questions">Вопросы и ответы</a></li><li><a href="#sources">Источники</a></li></ol></nav></aside><div class="article-body"><div class="answer-box"><p class="eyebrow">КОРОТКИЙ ОТВЕТ</p><p>${e(a.summary)}</p></div>${articleSections(a)}<section class="article-section" id="questions"><h2>Вопросы и ответы</h2><div class="faq-list">${a.faqs.map(([q,answer])=>`<details><summary>${e(q)}</summary><p>${e(answer)}</p></details>`).join('')}</div></section><section class="article-section article-sources" id="sources"><h2>Источники</h2><ol>${a.sources.map(s=>`<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a></li>`).join('')}</ol><p class="note">Статья не заменяет консультацию стоматолога.</p></section><section class="article-section article-next"><h2>Запись на консультацию</h2><p>Клиника «Премьер»: ${e(clinic.city)}, ${e(clinic.street)}. Телефон для записи:</p><a class="text-link" href="tel:${clinic.phone}">${e(clinic.telephone)}</a>${conversionCta('../../')}<div class="article-service-links">${a.relatedServices.map(slug=>{const p=pages.find(p=>p.slug===slug);if(!p)throw new Error(`Unknown related service: ${slug}`);return `<a href="../../services/${slug}/">${e(p.label)} <span aria-hidden="true">↗</span></a>`;}).join('')}</div></section></div></div></article><section class="service-section wrap"><p class="eyebrow">ЕЩЁ ПО ТЕМЕ</p><h2>Другие <em>статьи.</em></h2>${articleCards(articles.filter(item=>item.slug!==a.slug).sort((left,right)=>Number(right.relatedServices.some(s=>a.relatedServices.includes(s)))-Number(left.relatedServices.some(s=>a.relatedServices.includes(s)))).slice(0,3),'../../')}</section>`;
  const dir = new URL(`blog/${a.slug}/`,root);
  await mkdir(dir,{recursive:true});
  await writeFile(new URL('index.html',dir),pageShell(home,a.title,a.description,body,'../../',{article:true}));
}
console.log(`Generated blog and ${articles.length} medical articles.`);
