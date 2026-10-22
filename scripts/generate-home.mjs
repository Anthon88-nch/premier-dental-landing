import {readFile,writeFile} from 'node:fs/promises';
import {conversionCta,aftercareSection} from './conversion-markup.mjs';
import {pricePlans} from '../content/pricing.mjs';
import {reviews} from '../content/reviews.mjs';
import {reviewsWidget} from './reviews-widget-markup.mjs';
import {articles} from '../content/blog.mjs';
import {homeAnswers} from '../content/answers.mjs';
import {articleCards} from './blog-markup.mjs';
import {escapeHtml as escape} from './page-shell.mjs';
import {clinic} from '../content/site.mjs';
import {doctors} from '../content/doctors.mjs';
import {teamSection,laboratorySection} from './team-markup.mjs';
import {desktopNavigation} from './navigation-markup.mjs';
import {contactWidget} from './contact-widget-markup.mjs';
const file = new URL('../index.html',import.meta.url);
let html = await readFile(file,'utf8');
const arrow = '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const money = n => new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const services = [
 ['odnomomentnaya-implantaciya','ПОСЛЕ УДАЛЕНИЯ ЗУБА','Одномоментная имплантация','Имплант устанавливают в день удаления зуба, если состояние кости и десны позволяет.','Об установке после удаления'],
 ['all-on-4','ВСЯ ЧЕЛЮСТЬ','Зубы на четырёх имплантах','All-on-4 — несъёмный протез на четырёх имплантах для одной челюсти.','Метод и стоимость'],
 ['all-on-6','ВСЯ ЧЕЛЮСТЬ','Зубы на шести имплантах','All-on-6 — несъёмный протез на шести имплантах для одной челюсти.','Метод и стоимость'],
 ['ortoped','КОРОНКИ И ПРОТЕЗЫ','Стоматолог-ортопед','Восстановление зубов коронками, съёмными протезами и конструкциями на имплантах.','Протезирование и цены']
];
const solutions = `<section class="intro section wrap home-directions" id="solutions"><div class="section-heading"><p class="eyebrow">УСЛУГИ</p><h2>Имплантация<br><em>и протезирование.</em></h2></div><div class="home-services">${services.map(([slug,tag,name,desc,cta],i)=>`<a class="home-service" href="services/${slug}/"><span class="eyebrow">0${i+1} / ${tag}</span><h3>${name}</h3><p>${desc}</p><span class="home-card-action">${cta} ${arrow}</span></a>`).join('')}</div></section>`;
html = html.replace(/<section[^>]*id="solutions"[\s\S]*?<\/section>/,solutions);
const brands = [
 ['dentium','Dentium','ЮЖНАЯ КОРЕЯ','dentium-superline.webp','Dentium SuperLine — изображение производителя',500,399,'Коронки из металлокерамики или оксида циркония.'],
 ['astra-tech','Astra Tech','ШВЕЦИЯ','astra-tech-ev.webp','Astra Tech Implant EV — изображение производителя',1000,666,'Коронки из оксида циркония.']
];
const systems = `<section class="section wrap home-systems" id="systems"><div class="section-heading"><p class="eyebrow">СИСТЕМЫ ИМПЛАНТАЦИИ</p><h2>Импланты <em>Dentium и Astra Tech.</em></h2></div><div class="implant-grid">${brands.map(([slug,name,country,img,alt,w,h,desc])=>`<article class="implant-card"><a class="implant-visual" href="services/${slug}/" aria-label="Подробнее об имплантах ${name}"><img src="assets/${img}" ${slug==='astra-tech'?'srcset="assets/astra-tech-ev-500.webp 500w, assets/astra-tech-ev.webp 1000w" sizes="(max-width:700px) calc(100vw - 84px), 560px"':''} width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async"></a><div class="implant-copy"><p class="eyebrow">${country}</p><h3>${name}</h3><p>${desc}</p><a class="home-card-action" href="services/${slug}/">О системе и стоимости ${arrow}</a></div></article>`).join('')}</div><p class="note">На фото — Dentium SuperLine и Astra Tech EV. Модель и размер импланта подбирает врач.</p></section>`;
if(/id="systems"/.test(html))html=html.replace(/<section[^>]*id="systems"[\s\S]*?<\/section>/,systems);
else html=html.replace(solutions,solutions+'\n'+systems);
// An expired promotion is not part of the new homepage.
html=html.replace(/<section[^>]*id="offer"[\s\S]*?<\/section>\s*/,'');
const estimates = [
 ['dentium','Dentium + коронка из металлокерамики',pricePlans.dentium[0].total,'Один зуб: имплантат и постоянная коронка'],
 ['astra-tech','Astra Tech + коронка из оксида циркония',pricePlans['astra-tech'][0].total,'Один зуб: имплантат и постоянная коронка'],
 ['all-on-4','All-on-4 — одна челюсть',pricePlans['all-on-4'][0].total,'4 имплантата, пластика десны, мультиюниты, временный и постоянный протезы'],
 ['all-on-6','All-on-6 — одна челюсть',pricePlans['all-on-6'][0].total,'6 имплантатов, пластика десны, мультиюниты, временный и постоянный протезы']
];
const cost = `<section class="cost-section home-cost" id="cost"><div class="wrap section"><div class="section-heading"><p class="eyebrow">ЦЕНЫ</p><h2>Стоимость <em>лечения.</em></h2><p class="section-intro">Имплант с постоянной коронкой или протез на одну челюсть. Цены без скидок.</p></div><div class="home-prices">${estimates.map(([slug,name,price,desc])=>`<a class="home-price" href="services/${slug}/#prices"><div><h3>${name}</h3><p>${desc}</p></div><div class="home-price-value"><strong>${money(price)}</strong><span>Что входит ${arrow}</span></div></a>`).join('')}</div><p class="note">Дополнительные процедуры, диагностика и анестезия рассчитываются отдельно. Для одного зуба временная коронка не включена; для All-on-4/6 временный протез включён. Итоговый состав согласуется после обследования.</p><div class="home-cost-actions"><button class="button button-dark" data-book="Обсудить план лечения">Записаться на консультацию <span class="arrow">${arrow}</span></button><a class="text-link" href="services/ortoped/#prices">Цены на коронки и протезы ${arrow}</a></div></div></section>`;
html=html.replace(/<section[^>]*id="cost"[\s\S]*?<\/section>/,cost);
html=html.replace(/<p class="hero-service">[\s\S]*?<\/p>/,`<p class="hero-service">Dentium с постоянной коронкой<br><strong>от ${money(pricePlans.dentium[0].total)}</strong></p>`);
html=html.replace(/<p class="hero-desc">[\s\S]*?<\/p>/,'<p class="hero-desc">Своя зуботехническая лаборатория.<br>Бесплатные контрольные осмотры раз в 6 месяцев.</p>');
html=html.replace('Из чего складывается стоимость','Посмотреть стоимость лечения');
html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Имплантация и протезирование зубов в Набережных Челнах: одномоментная имплантация, All-on-4, All-on-6, Dentium, Astra Tech и стоматолог-ортопед. Премьер, Пушкина, 4.">');
const menu = services.map(([slug,,name])=>`<a href="services/${slug}/">${name}</a>`).join('')+brands.map(([slug,name])=>`<a href="services/${slug}/">Импланты ${name}</a>`).join('');
html=html.replace(/(<nav id="mobile-menu"[^>]*>)[\s\S]*?<\/nav>/,`$1<a href="services/">Все услуги</a>${menu}<a href="#contacts">Контакты</a></nav>`);
const reviewSection = `<section class="section wrap home-reviews" id="reviews"><div class="section-heading"><p class="eyebrow">ОПЫТ ПАЦИЕНТОВ</p><h2>Отзывы <em>пациентов.</em></h2></div><div class="review-grid">${reviews.map(r=>`<article class="review-card"><p class="eyebrow">${r.topic}</p><blockquote>«${r.excerpt}»</blockquote><p class="review-author">${r.author}</p><p class="review-meta">${r.date}<br>ПроДокторов · оценка 5,0</p><a class="text-link" href="reviews/#${r.id}">Читать полный отзыв ${arrow}</a></article>`).join('')}</div><p class="note">Отзывы с ПроДокторов. Результаты лечения могут отличаться.</p><a class="text-link" href="reviews/">Смотреть ещё отзывы ${arrow}</a></section>`;
const reviewsWithWidget = reviewSection.replace('<div class="review-grid">',reviewsWidget()+'<div class="review-grid">');
if(/id="reviews"/.test(html))html=html.replace(/<section[^>]*id="reviews"[\s\S]*?<\/section>/,reviewsWithWidget);
else html=html.replace('<section class="section faq-section',reviewsWithWidget+'\n<section class="section faq-section');
html=html.replace('<a href="#contacts">Контакты</a></nav>','<a href="reviews/">Отзывы</a><a href="#contacts">Контакты</a></nav>');
html=html.replace(/(?:<a href="reviews\/">Отзывы<\/a>)+/g,'<a href="reviews/">Отзывы</a>');
html=html.replace(/(<nav id="mobile-menu"[^>]*>)([\s\S]*?)(<a href="#contacts">)/, '$1$2<a href="reviews/">Отзывы</a>$3');
// Keep the established visual hierarchy while naming the primary service in H1.
html=html.replace(/<h1 id="hero-title">[\s\S]*?<\/h1>/,'<h1 id="hero-title">Имплантация зубов</h1>');
html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>Имплантация зубов в Набережных Челнах — цены | Премьер</title>');
html=html.replace(/<section[^>]*id="faq"[\s\S]*?<\/section>/,`<section class="section faq-section wrap" id="faq"><div><p class="eyebrow">ВОПРОСЫ ПАЦИЕНТОВ</p><h2>Частые <em>вопросы.</em></h2></div><div class="faq-list">${homeAnswers.map(([q,a])=>`<details><summary>${escape(q)}<span aria-hidden="true">+</span></summary><p>${escape(a)}</p></details>`).join('')}</div></section>`);
const blog = `<section class="section wrap home-blog" id="blog"><div class="section-heading"><p class="eyebrow">БЛОГ PREMIER</p><h2>Статьи <em>об имплантации.</em></h2></div>${articleCards(articles.slice(0,3))}<a class="text-link" href="blog/">Все статьи об имплантации ${arrow}</a></section>`;
if(/id="blog"/.test(html))html=html.replace(/<section[^>]*id="blog"[\s\S]*?<\/section>/,blog);
else html=html.replace('<section class="section faq-section',blog+'\n<section class="section faq-section');
html=html.replace(/(?:<a href="blog\/">Блог<\/a>)+/g,'');
html=html.replaceAll('<a href="#contacts">Контакты</a>','<a href="blog/">Блог</a><a href="#contacts">Контакты</a>');
if(!html.includes('href="blog.css"'))html=html.replace('</head>','<link rel="stylesheet" href="blog.css">\n</head>');
html=html.replace(/<nav class="desktop-nav"[^>]*>[\s\S]*?<\/nav>/,desktopNavigation());
if(!html.includes('class="site-header"')) {
  html=html.replace('<header class="header wrap">','<div class="site-header"><header class="header wrap">');
  html=html.replace(/(<nav id="mobile-menu"[^>]*>[\s\S]*?<\/nav>)/,'$1</div>');
}
const laboratory = `<aside class="clinic-lab"><h3>${escape(clinic.laboratory.heading)}</h3><a class="text-link" href="#laboratory">Посмотреть лабораторию ${arrow}</a></aside>`;
if(html.includes('class="clinic-lab"'))html=html.replace(/<aside class="clinic-lab">[\s\S]*?<\/aside>/,laboratory);
else html=html.replace(/(<div class="clinic-heading">[\s\S]*?)(<a class="text-link" href="#contacts">)/,'$1'+laboratory+'$2');
html=html.replace(/<section[^>]*id="doctor"[\s\S]*?<\/section>/,teamSection('implantology','',{home:true}));
const labGallery=laboratorySection();
if(/id="laboratory"/.test(html))html=html.replace(/<section[^>]*id="laboratory"[\s\S]*?<\/section>/,labGallery);
else html=html.replace(/(<section[^>]*id="reviews")/,labGallery+'\n$1');
html=html.replace(/(<nav id="mobile-menu"[^>]*>[\s\S]*?)(<a href="#contacts">)/,'$1<a href="doctors/">Врачи</a>$2');
const featured=doctors.find(d=>d.slug==='sharifullin-ruslan');
html=html.replace('href="assets/doctor-full.jpg"',`href="${featured.image}"`);
html=html.replace(/<img class="hero-doctor"[^>]+>/,`<img class="hero-doctor" src="${featured.image}" srcset="${featured.image.replace('.webp','-400.webp')} 400w, ${featured.image} 800w" sizes="(max-width:600px) calc(100vw - 36px), 45vw" width="${featured.imageWidth}" height="${featured.imageHeight}" alt="${featured.name}, хирург-имплантолог клиники Премьер" fetchpriority="high">`);
if(!html.includes('href="team.css"'))html=html.replace('</head>','<link rel="stylesheet" href="team.css">\n</head>');
// Compact repeated actions: one booking destination, with relevant proof nearby.
for(const [id,context] of [['solutions','Выбор метода имплантации'],['systems','Выбор системы имплантации'],['steps','Этапы лечения'],['clinic','Консультация в клинике'],['reviews','Запись после отзывов'],['blog','Вопрос по имплантации'],['faq','Вопрос по лечению']]) {
  const pattern=new RegExp('(<section[^>]*id="'+id+'"[\\s\\S]*?)(</section>)');
  html=html.replace(pattern,(_,body,close)=>body.replace(/<!-- CRO:CTA -->[\s\S]*?<!-- \/CRO:CTA -->/g,'')+'<!-- CRO:CTA -->'+conversionCta('',{context})+'<!-- /CRO:CTA -->'+close);
}
html=html.replace(/<!-- CRO:AFTERCARE -->[\s\S]*?<!-- \/CRO:AFTERCARE -->/g,'');
html=html.replace(/(<section[^>]*id="steps")/,'<!-- CRO:AFTERCARE -->'+aftercareSection('')+'<!-- /CRO:AFTERCARE -->\n$1');
html=html.replace(/<p class="hero-price-note">[\s\S]*?<\/p>/,'');
html=html.replace('<div class="hero-trust">','<p class="hero-price-note">Цена с металлокерамической коронкой. Диагностика, анестезия и дополнительные процедуры оплачиваются отдельно.</p><div class="hero-trust">');
html=html.replace(/<button class="button button-dark"/g,'<button class="button button-dark booking-accent"');
html=html.replace(/<link rel="preload"[^>]*as="image"[^>]*>/,'<link rel="preload" href="assets/doctor-sharifullin-ruslan.webp" as="image" imagesrcset="assets/doctor-sharifullin-ruslan-400.webp 400w, assets/doctor-sharifullin-ruslan.webp 800w" imagesizes="(max-width:600px) calc(100vw - 36px), 45vw" fetchpriority="high">');
if(!html.includes('href="contact-widget.css"'))html=html.replace('</head>','<link rel="stylesheet" href="contact-widget.css">\n<script src="contact-widget.js" defer></script>\n</head>');
html=html.replace(/<!-- CONTACT:WIDGET -->[\s\S]*?<!-- \/CONTACT:WIDGET -->\s*/g,'');
html=html.replace('</body>','<!-- CONTACT:WIDGET -->'+contactWidget()+'<!-- /CONTACT:WIDGET -->\n</body>');
await writeFile(file,html);
console.log('Homepage updated: direct service links, implant images and brief prices.');
