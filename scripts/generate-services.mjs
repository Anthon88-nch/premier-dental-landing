import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {pageShell,headingHtml} from './page-shell.mjs';
import {teamSection,laboratorySection} from './team-markup.mjs';
import {articles} from '../content/blog.mjs';
import {pages, stages} from '../content/services.mjs';
import {reviews} from '../content/reviews.mjs';
import {reviewsWidget} from './reviews-widget-markup.mjs';
import {pricePlans, additionalPrices, orthopedicPrices} from '../content/pricing.mjs';
import {conversionCta,aftercareSection} from './conversion-markup.mjs';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('templates/home-base.html', root), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const booking = (page,prefix='../../',context=page?.label || 'Консультация по имплантации') => conversionCta(prefix,{context,implantology:page?.slug!=='ortoped'});
const money = value => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
function implantPhoto(page,prefix) {
  if(page.type !== 'brand')return '';
  const dentium=page.slug === 'dentium';
  return `<figure class="brand-product"><img src="${prefix}assets/${dentium?'dentium-superline':'astra-tech-ev'}.webp" width="${dentium?500:1000}" height="${dentium?399:666}" alt="${dentium?'Dentium SuperLine':'Astra Tech EV'} — изображение производителя" loading="lazy"><figcaption>${dentium?'Dentium SuperLine':'Astra Tech EV'}. Пример изделия; модель и размер подбирает врач.</figcaption></figure>`;
}
function pricing(page) {
  if(page.slug === 'ortoped') return `<section class="service-section wrap" id="prices"><p class="eyebrow">СТОИМОСТЬ ПРОТЕЗИРОВАНИЯ</p><h2>Коронки и протезы <em>на имплантатах.</em></h2><p class="service-lead">Цены указаны без скидок. Стоимость указана за ортопедическую конструкцию; установка имплантатов в неё не входит.</p><div class="price-plan"><dl>${orthopedicPrices.map(([name,value])=>`<div><dt>${escape(name)}</dt><dd>${money(value)}</dd></div>`).join('')}</dl></div><p class="note">Цены на протезы приведены для одной челюсти. Мультиюниты, имплантаты, хирургические и подготовительные процедуры рассчитываются отдельно. Цену коронок на собственных зубах и других видов протезирования уточните после осмотра.</p><div class="price-payment"><h3>Оплата постоянной конструкции</h3><p>30% — в день снятия слепков, остаток — в день сдачи работы. Состав и итоговая стоимость лечения согласуются заранее.</p></div>${booking(page,'../../','Консультация ортопеда')}</section>`;
  const plans = pricePlans[page.slug] || [...pricePlans.dentium,...pricePlans['astra-tech']];
  return `<section class="service-section wrap" id="prices"><p class="eyebrow">СТОИМОСТЬ ЛЕЧЕНИЯ</p><h2>Стоимость <em>лечения.</em></h2><p class="service-lead">Цены указаны без скидок. Дополнительные процедуры рассчитывают после диагностики.</p>
    <div class="price-plans">${plans.map(plan=>`<article class="price-plan"><h3>${escape(plan.name)}</h3><p class="price-total">${money(plan.total)}</p><dl>${plan.rows.map(([name,value])=>`<div><dt>${escape(name)}</dt><dd>${money(value)}</dd></div>`).join('')}</dl></article>`).join('')}</div>
    <p class="note">${page.count ? 'Расчёт приведён для одной челюсти и включает временный и постоянный протезы. Две челюсти рассчитываются отдельно.' : 'Это расчёт имплантата и постоянной коронки для одного зуба. Временная коронка, удаление и подготовительные процедуры в указанную сумму не включены.'} В хирургический этап входят установка имплантата, формирователь десны, абатмент и осмотры согласно плану клиники. Анестезия оплачивается отдельно. Итоговую стоимость согласуют до начала лечения.</p>
    <details class="price-extra"><summary>Консультация и возможные дополнительные расходы</summary><dl>${additionalPrices.map(([name,value])=>`<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><p>КТ и анализы оплачиваются отдельно. Временный протез и пластика десны уже включены в расчёты All-on-4/6.</p></details>
    <div class="price-payment"><h3>Оплата по этапам</h3><p>Имплантация и временная конструкция оплачиваются в день приёма. Постоянная конструкция — 30% в день снятия слепков, остаток в день сдачи работы. Возможна беспроцентная рассрочка без акционных скидок; условия уточните в клинике.</p></div>${booking(page,'../../','Обсудить стоимость '+page.label)}</section>`;
}
const link = (page, prefix) => `${prefix}services/${page.slug}/`;
const cards = (items, prefix) => `<div class="service-cards">${items.map((p, i) => `<a class="service-card" href="${link(p,prefix)}"><span class="eyebrow">${String(i+1).padStart(2,'0')} / ${p.type === 'brand' ? 'СИСТЕМА ИМПЛАНТАЦИИ' : 'ЛЕЧЕНИЕ'}</span><h3>${escape(p.label)}</h3><p>${escape(p.intro)}</p><span class="service-card-link">Подробнее ${arrow}</span></a>`).join('')}</div>`;
const reading = page => `<section class="service-section service-reading wrap"><p class="eyebrow">БЛОГ</p><h2>Статьи <em>по теме.</em></h2><div class="service-reading-links">${articles.filter(a=>a.relatedServices.includes(page.slug)).slice(0,3).map(a=>`<a href="../../blog/${a.slug}/">${escape(a.heading)}</a>`).join('')}</div></section>`;
const shell = (title, description, body, prefix) => pageShell(home,title,description,body,prefix,{prices:prefix === '../../'});
function breadcrumb(label, prefix) {
  return `<nav class="breadcrumbs wrap" aria-label="Хлебные крошки"><a href="${prefix}index.html">Главная</a><span aria-hidden="true">/</span><a href="${prefix}services/">Услуги</a>${label ? `<span aria-hidden="true">/</span><span aria-current="page">${escape(label)}</span>` : ''}</nav>`;
}
function consultation(prefix, page) {
  if(page?.slug === 'ortoped') return `<section class="service-consult wrap" id="consultation"><div><p class="eyebrow">КОНСУЛЬТАЦИЯ ОРТОПЕДА</p><h2>Запись <em>к ортопеду.</em></h2><p>На консультации врач осмотрит зубы, предложит варианты протезирования и рассчитает стоимость.</p>${booking(page,prefix,'Консультация ортопеда')}</div><figure><img src="${prefix}assets/reception.webp" loading="lazy" width="571" height="381" alt="Ресепшен стоматологии Премьер"><figcaption>Премьер на Пушкина, 4<br><span>Время приёма согласуется с администратором</span></figcaption></figure></section>`;
  return `<section class="service-consult wrap" id="consultation"><div><p class="eyebrow">КОНСУЛЬТАЦИЯ</p><h2>Запись <em>к имплантологу.</em></h2><p>Врач изучит снимки и объяснит, какие варианты имплантации подходят вам, сколько стоит лечение и сколько времени оно займёт.</p>${booking(page,prefix,'Консультация по имплантации')}</div><figure><img src="${prefix}assets/doctor-sharifullin-ruslan.webp" srcset="${prefix}assets/doctor-sharifullin-ruslan-400.webp 400w, ${prefix}assets/doctor-sharifullin-ruslan.webp 800w" sizes="(min-width:1000px) 430px, calc(100vw - 48px)" width="800" height="1199" loading="lazy" decoding="async" alt="Шарифуллин Руслан Рушанович, хирург-имплантолог"><figcaption>Шарифуллин Руслан Рушанович<br><span>Хирург-имплантолог клиники «Премьер»</span></figcaption></figure></section>`;
}
for(const page of pages) {
  const prefix = '../../';
  const body = `${breadcrumb(page.label,prefix)}
    <section class="service-hero service-hero-compact wrap"><div><p class="eyebrow">PREMIER / НАБЕРЕЖНЫЕ ЧЕЛНЫ</p><h1>${headingHtml(page.heading)}</h1><p class="service-lead">${escape(page.accent)}</p>${booking(page,prefix)}</div><aside class="service-summary">${implantPhoto(page,prefix)}<p class="eyebrow">ОБ УСЛУГЕ</p><ul>${page.facts.map(f=>`<li>${escape(f)}</li>`).join('')}</ul><a class="text-link" href="#treatment">Как проходит лечение ${arrow}</a></aside></section>
    <nav class="service-jump wrap" aria-label="Разделы страницы"><a href="#about">О методе</a><a href="#prices">Цены</a><a href="#treatment">Этапы</a><a href="#questions">Вопросы</a><a href="#consultation">Консультация</a></nav>
    <section class="service-section wrap" id="about"><p class="eyebrow">01 / ВАЖНО ЗНАТЬ</p><div class="service-editorial">${page.sections.map(([h,p])=>`<article><h2>${escape(h)}</h2><p>${escape(p)}</p></article>`).join('')}</div>${booking(page,prefix)}</section>
    ${pricing(page)}
    <section class="service-section service-tinted" id="treatment"><div class="wrap"><p class="eyebrow">02 / ЭТАПЫ ЛЕЧЕНИЯ</p><h2>Как проходит <em>лечение.</em></h2><ol class="service-steps">${(page.stages || stages).map(([h,p])=>`<li><h3>${escape(h)}</h3><p>${escape(p)}</p></li>`).join('')}</ol><p class="note">${escape(page.stagesNote || 'Это общий порядок лечения. Для одномоментной имплантации, одного зуба и всей челюсти врач составляет отдельный план.')}</p>${booking(page,prefix)}</div></section>
    <section class="service-section wrap" id="questions"><p class="eyebrow">03 / ОТВЕТЫ НА ВОПРОСЫ</p><h2>Частые <em>вопросы.</em></h2><div class="faq-list">${page.faqs.map(([q,a])=>`<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}</div>${booking(page,prefix)}</section>
    ${teamSection(page.slug==='ortoped'?'orthopedics':'implantology',prefix)}
    ${page.slug==='ortoped'?laboratorySection(prefix,{compact:true}):''}
    ${reading(page)}
    ${aftercareSection(prefix,{implantology:page.slug!=='ortoped'})}
    ${consultation(prefix,page)}
    <section class="service-section wrap"><p class="eyebrow">СВЯЗАННЫЕ НАПРАВЛЕНИЯ</p><h2>Другие <em>услуги.</em></h2>${cards(pages.filter(p=>p.slug!==page.slug).sort((a,b)=>Number(b.type===page.type)-Number(a.type===page.type)).slice(0,3),prefix)}${booking(page,prefix)}</section>`;
  const dir = new URL(`services/${page.slug}/`,root);
  await mkdir(dir,{recursive:true});
  await writeFile(new URL('index.html',dir),shell(page.title,page.description,body,prefix));
}
const prefix='../';
const body = `${breadcrumb('',prefix)}<section class="service-hub-hero wrap"><p class="eyebrow">УСЛУГИ PREMIER</p><h1>Имплантация<br><em>и протезирование.</em></h1><p class="service-lead">Восстановление одного зуба или всей челюсти. Методы, этапы лечения и цены.</p>${conversionCta(prefix)}</section><section class="service-section wrap"><h2>Восстановление <em>зубов.</em></h2>${cards(pages.filter(p=>p.type==='service'),prefix)}${conversionCta(prefix,{context:'Консультация: имплантация и протезирование',implantology:false})}</section><section class="service-section wrap"><h2>Системы <em>имплантации.</em></h2><p class="service-lead">В клинике устанавливают имплантаты Dentium и Astra Tech.</p>${cards(pages.filter(p=>p.type==='brand'),prefix)}${conversionCta(prefix)}</section>${consultation(prefix)}`;
await mkdir(new URL('services/',root),{recursive:true});
await writeFile(new URL('services/index.html',root),shell('Услуги стоматологии Премьер — имплантация в Набережных Челнах','Одномоментная имплантация, All-on-4, All-on-6, системы Dentium и Astra Tech: направления лечения в клинике Премьер.',body,prefix));
console.log(`Generated services hub and ${pages.length} service pages.`);
const reviewBody = `<nav class="breadcrumbs wrap" aria-label="Хлебные крошки"><a href="../index.html">Главная</a><span aria-hidden="true">/</span><span aria-current="page">Отзывы</span></nav><section class="service-hub-hero wrap"><p class="eyebrow">ОПЫТ ПАЦИЕНТОВ PREMIER</p><h1>Отзывы <em>о лечении.</em></h1><p class="service-lead">Отзывы пациентов об имплантации и протезировании в клинике «Премьер».</p>${conversionCta('../')}</section><section class="service-section wrap review-full-list" aria-label="Отзывы пациентов">${reviews.map(r=>`<article class="review-full" id="${r.id}"><p class="eyebrow">${r.topic} · ПроДокторов</p><h2>${r.author}</h2><p class="review-meta">${r.date} · Оценка 5,0</p><blockquote><h3>История пациента</h3><p>${r.history}</p>${r.liked?`<h3>Понравилось</h3><p>${r.liked}</p>`:''}</blockquote><details class="review-original"><summary>Посмотреть исходный скриншот</summary><img src="../assets/${r.image}" alt="Скриншот отзыва: ${r.author}, ${r.date}" width="1080" height="${r.image==='review-implantation.webp'?1289:r.image==='review-treatment-plan.webp'?1416:1250}" loading="lazy" decoding="async"></details></article>`).join('')}<p class="note">Отзывы описывают личный опыт пациентов. Результаты лечения могут отличаться.</p>${conversionCta('../',{context:'Консультация: имплантация и протезирование',implantology:false})}</section>`;
await mkdir(new URL('reviews/',root),{recursive:true});
await writeFile(new URL('reviews/index.html',root),shell('Отзывы пациентов — стоматология Премьер в Набережных Челнах','Отзывы пациентов об имплантации и протезировании зубов в стоматологии Премьер. Отзывы с ПроДокторов.',reviewBody.replace('<section class="service-section wrap review-full-list"', '<section class="service-section wrap" aria-label="Виджет отзывов">'+reviewsWidget('../')+'</section><section class="service-section wrap review-full-list"'),'../'));
