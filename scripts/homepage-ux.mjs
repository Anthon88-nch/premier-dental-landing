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
  return html;
}
