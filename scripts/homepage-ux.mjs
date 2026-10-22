import {pricePlans} from '../content/pricing.mjs';
import {escapeHtml as e} from './page-shell.mjs';

const money=value=>new Intl.NumberFormat('ru-RU').format(value)+' ₽';
// Homepage composition is isolated from the unchanged inner-page shell.
export function mainSections(html) {
  const start=html.indexOf('<main id="main">')+'<main id="main">'.length;
  const end=html.indexOf('</main>',start);
  const content=html.slice(start,end),sections=[];
  let depth=0,begin=0;
  for(const match of content.matchAll(/<\/?section\b[^>]*>/g)) {
    if(!match[0].startsWith('</')) {if(depth++===0)begin=match.index;}
    else if(--depth===0)sections.push(content.slice(begin,match.index+match[0].length));
  }
  return {start,end,sections};
}
const sectionId=section=>section.match(/^<section[^>]*\bid="([^"]+)"/)?.[1] || 'hero';
export const replaceSection=(html,id,replacement)=>{
  const {sections}=mainSections(html),section=sections.find(value=>sectionId(value)===id);
  if(!section)throw new Error(`Missing homepage section: ${id}`);
  return html.replace(section,replacement);
};
function carousel(html,className,id,label,slideTag) {
  const opening=new RegExp('<div class="'+className+'[^\"]*">').exec(html);
  if(!opening)throw new Error(`Missing carousel: ${className}`);
  const tail=html.slice(opening.index);
  let depth=0,end=0;
  for(const match of tail.matchAll(/<\/?div\b[^>]*>/g)) {
    depth+=match[0].startsWith('</')?-1:1;
    if(depth===0){end=match.index+match[0].length;break;}
  }
  const original=tail.slice(0,end);
  const count=[...original.matchAll(new RegExp('<'+slideTag+'\\b','g'))].length;
  const track=original.replace(/^<div([^>]*)>/,`<div$1 id="${id}" data-ux-carousel role="region" aria-label="${label}" tabindex="0">`)
    .replace(new RegExp('<'+slideTag+'\\b','g'),'<'+slideTag+' data-ux-slide');
  return html.replace(original,track+`<p class="ux-carousel-status" data-carousel-status="${id}" role="status" aria-live="polite" aria-atomic="true" hidden>1 / ${count}</p>`);
}
function divByClass(html,className) {
  const opening=new RegExp('<div class="'+className+'[^\"]*"[^>]*>').exec(html);
  if(!opening)throw new Error(`Missing homepage group: ${className}`);
  const tail=html.slice(opening.index);let depth=0;
  for(const match of tail.matchAll(/<\/?div\b[^>]*>/g)) {
    depth+=match[0].startsWith('</')?-1:1;
    if(depth===0)return tail.slice(0,match.index+match[0].length);
  }
  throw new Error(`Unclosed homepage group: ${className}`);
}

export function homepageUx(html) {
  html=html.replace('<body>','<body class="home-page">');
  const {start,end,sections}=mainSections(html);
  const blocks=Object.fromEntries(sections.map(section=>[sectionId(section),section]));
  const steps=blocks.steps.replace('</section>',blocks.aftercare+'</section>');
  const cost=blocks.cost.replace('</section>',blocks.systems+'</section>');
  const clinic=blocks.clinic.replace('</section>',blocks.laboratory+'</section>');
  const order=[blocks.hero,blocks.solutions,cost,blocks.reviews,blocks.doctor,steps,clinic,blocks.faq,blocks.contacts];
  html=html.slice(0,start)+'\n'+order.join('\n')+'\n'+html.slice(end);
  html=html.replace(/(<div class="footer-top">)/,'$1<a class="home-footer-blog" href="blog/">Блог</a>');

  // 02: one comparison and a visible treatment breakdown.
  const implantImages=[...blocks.systems.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
  const systems=[['dentium','Dentium','Южная Корея','Металлокерамика или оксид циркония'],['astra-tech','Astra Tech','Швеция','Оксид циркония']];
  const comparison=systems.map(([slug,name,country,material],i)=>`<article class="ux-system-card"><div class="ux-system-heading"><h3>${name}</h3>${i===0?'<span class="ux-choice-badge">Чаще выбирают</span>':''}</div><a class="ux-implant-image" href="services/${slug}/" aria-label="Подробнее об имплантах ${name}">${implantImages[i]}</a><dl><div><dt>Страна</dt><dd>${country}</dd></div><div><dt>Материал коронки</dt><dd>${material}</dd></div><div><dt>Гарантия клиники</dt><dd><a href="#aftercare">1 год — условия</a></dd></div><div><dt>Цена за один зуб</dt><dd class="ux-treatment-price">от ${money(pricePlans[slug][0].total)}</dd></div></dl><a class="text-link" href="services/${slug}/#prices">Что входит в стоимость <span aria-hidden="true">→</span></a></article>`).join('');
  const fullArch=['all-on-4','all-on-6'].map(slug=>{
    const plan=pricePlans[slug][0];
    return `<article class="ux-arch-card"><h3>${e(plan.name)}</h3><p class="ux-treatment-price">${money(plan.total)}</p><p class="eyebrow">ЧТО ВХОДИТ</p><ul>${plan.rows.map(([name])=>`<li>${e(name)}</li>`).join('')}</ul><a class="text-link" href="services/${slug}/#prices">Метод и подробный расчёт <span aria-hidden="true">→</span></a></article>`;
  }).join('');
  const costButton=blocks.cost.match(/<button\b[^>]*data-book[^>]*>[\s\S]*?<\/button>/)[0];
  const costNote=blocks.cost.match(/<p class="note">[\s\S]*?<\/p>/)[0];
  const systemNote=blocks.systems.match(/<p class="note">[\s\S]*?<\/p>/)[0];
  html=replaceSection(html,'cost',`<section class="cost-section home-cost" id="cost" aria-labelledby="cost-title"><div class="wrap section"><div class="section-heading"><p class="eyebrow">ЦЕНЫ</p><h2 id="cost-title">Стоимость <em>лечения.</em></h2><p class="section-intro">Имплант с постоянной коронкой или протез на одну челюсть. Цены без скидок.</p></div><div class="ux-system-comparison" id="systems">${comparison}</div>${systemNote}<div class="ux-arch-prices">${fullArch}</div>${costNote}<p class="ux-installment">{{TODO: рассрочка от X ₽/мес}}</p><div class="home-cost-actions">${costButton}<a class="text-link" href="services/ortoped/#prices">Цены на коронки и протезы <span aria-hidden="true">→</span></a></div></div></section>`);
  const mainStart=html.indexOf('<main id="main">'),mainEnd=html.indexOf('</main>');
  html=html.slice(0,mainStart)+html.slice(mainStart,mainEnd).replaceAll('Профессиональная гигиена оплачивается отдельно.','')+html.slice(mainEnd);
  html=html.replace('<p class="ux-installment">','<p class="note ux-hygiene-note">Профессиональная гигиена оплачивается отдельно.</p><p class="ux-installment">');

  // 03: retain the original booking contexts, without repeated trust blocks.
  html=html.replace(/<div class="conversion-cta">[\s\S]*?<\/p><\/div><\/div>/g,'')
    .replace(/<!-- \/?CRO:CTA -->/g,'');
  const sectionButton=(source,context,label)=>source.match(new RegExp('<button\\b[^>]*data-book="'+context+'"[^>]*>[\\s\\S]*?</button>'))[0].replace('Записаться на консультацию',label);
  html=html.replace(costButton,costButton.replace('Записаться на консультацию','Рассчитать стоимость для вашего случая'));
  for(const [id,context,label] of [['steps','Этапы лечения','Начать с консультации'],['faq','Вопрос по лечению','Записаться на консультацию']]) {
    const section=mainSections(html).sections.find(value=>sectionId(value)===id);
    html=replaceSection(html,id,section.replace(/<\/section>$/,`<div class="ux-section-action">${sectionButton(blocks[id],context,label)}</div></section>`));
  }

  // 04: price orientation belongs to the existing service-card link.
  const servicePrices={'odnomomentnaya-implantaciya':`от ${money(pricePlans.dentium[0].total)}`,'all-on-4':`от ${money(pricePlans['all-on-4'][0].total)}`,'all-on-6':`от ${money(pricePlans['all-on-6'][0].total)}`,ortoped:'{{TODO: цена от}}'};
  html=html.replace(/<a class="home-service" href="services\/([^"]+)\/">[\s\S]*?<\/a>/g,(card,slug)=>{
    const priced=card.replace('<span class="home-card-action">',`<p class="ux-service-price">${servicePrices[slug]}</p><span class="home-card-action">`);
    return slug==='all-on-4'?priced.replace('class="home-service"','class="home-service ux-featured-service"'):priced;
  });

  // 05: a compact consultation offer; unconfirmed rating stays a placeholder.
  const star='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z"/></svg>';
  const consultation=`<div class="ux-consultation-info"><p class="ux-consultation-line">Осмотр, план лечения и смета за один визит</p><p class="ux-hero-rating">${star}<span>{{TODO: 5,0 · ПроДокторов · N отзывов}}</span></p></div>`;
  const hero=mainSections(html).sections[0].replace(/<div class="hero-bottom">[\s\S]*?<\/div>/,'')
    .replace(/(<div class="hero-actions"><button\b[^>]*>[\s\S]*?<\/button>)/,'$1'+consultation);
  html=replaceSection(html,'hero',hero);

  // 06: follow-up and contractual guarantee remain reachable at #aftercare.
  const followup=html.match(/<section\b[^>]*id="aftercare"[^>]*>[\s\S]*?<\/section>/)[0];
  const followupBody=followup.replace(/^<section[^>]*>/,'<div class="ux-aftercare" id="aftercare">').replace(/<\/section>$/,'</div>')
    .replace(/<p class="eyebrow">[\s\S]*?<\/p>/,'').replace(/<h2>[\s\S]*?<\/h2>/,'');
  let updatedSteps=mainSections(html).sections.find(value=>sectionId(value)==='steps').replace(followup,'');
  let stepIndex=0;
  updatedSteps=updatedSteps.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g,step=>{
    const number=++stepIndex;
    return step.replace('</h3>','</h3><p class="ux-step-time">{{TODO: срок}}</p>').replace('</article>',(number===4?followupBody:'')+'</article>');
  });
  html=replaceSection(html,'steps',updatedSteps);

  // 07: native horizontal tracks; desktop grids and action handlers are intact.
  html=carousel(html,'doctor-grid','home-doctor-carousel','Врачи клиники','article');
  html=carousel(html,'review-grid','home-review-carousel','Отзывы пациентов','article');
  html=carousel(html,'laboratory-grid','home-laboratory-carousel','Фотографии зуботехнической лаборатории','figure');
  html=html.replace('</head>','<script src="home-ux.js" defer></script>\n</head>');

  // 08: one clinic story, with real photographs, technician and existing video.
  const lab=html.match(/<section\b[^>]*id="laboratory"[^>]*>[\s\S]*?<\/section>/)[0];
  const labHeading=divByClass(lab,'section-heading').replace('class="section-heading"','class="ux-laboratory-heading"').replace('<h2>','<h3 id="laboratory-title">').replace('</h2>','</h3>');
  const labTrack=divByClass(lab,'laboratory-grid');
  const labCounter=lab.match(/<p class="ux-carousel-status"[^>]*>[\s\S]*?<\/p>/)[0];
  const technician=divByClass(lab,'laboratory-technician').replace('<h3>','<h4>').replace('</h3>','</h4>');
  const video=lab.match(/<figure class="laboratory-video">[\s\S]*?<\/figure>/)[0];
  const labLink=lab.match(/<a class="text-link"[^>]*>[\s\S]*?<\/a>/)[0];
  const clinicIntro=divByClass(blocks.clinic,'clinic-heading').replace('class="clinic-heading"','class="ux-clinic-intro"').replace(/<aside class="clinic-lab">[\s\S]*?<\/aside>/,'');
  const clinicGallery=divByClass(blocks.clinic,'clinic-gallery');
  html=replaceSection(html,'clinic',`<section class="section wrap ux-clinic" id="clinic">${clinicIntro}${clinicGallery}<div class="ux-laboratory" id="laboratory" role="group" aria-labelledby="laboratory-title">${labHeading}${labTrack}${labCounter}${technician}${video}${labLink}</div></section>`);
  const contacts=mainSections(html).sections.find(section=>sectionId(section)==='contacts');
  html=replaceSection(html,'contacts',contacts.replace(/<\/section>$/,'<div class="ux-contact-extras"><div class="ux-map-placeholder" role="img" aria-label="Место для Яндекс.Карты"><!-- TODO: виджет Яндекс.Карт --><span>{{TODO: виджет Яндекс.Карт}}</span></div><div class="ux-entrance-placeholder" role="img" aria-label="Место для фотографии входа"><span>{{TODO: фото входа в клинику}}</span></div></div></section>'));
  return html;
}
