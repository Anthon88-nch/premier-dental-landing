import {escapeHtml as e} from './page-shell.mjs';

const arrow = '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';

export function consultationButton(context='Консультация по имплантации') {
  return `<button class="button button-dark booking-accent" data-book="${e(context)}">Записаться на консультацию <span class="arrow">${arrow}</span></button>`;
}

export function conversionCta(prefix='',{context='Консультация по имплантации',implantology=true}={}) {
  return `<div class="conversion-cta">${consultationButton(context)}<div class="conversion-trust"><a href="${prefix}reviews/">Отзывы пациентов</a><p>${implantology?'Бесплатные контрольные осмотры раз в 6 месяцев. <span>Профессиональная гигиена оплачивается отдельно.</span>':'Собственная зуботехническая лаборатория.'}</p></div></div>`;
}

export function aftercareSection(prefix='',{implantology=true}={}) {
  return `<section class="aftercare-block service-section wrap" id="aftercare"><p class="eyebrow">НАБЛЮДЕНИЕ И УСЛОВИЯ ГАРАНТИИ</p><h2>После <em>лечения.</em></h2>${implantology?'<p>Осмотр и снятие швов — через 10 дней после операции.</p>':''}<p>Профилактические осмотры раз в 6 месяцев бесплатные. Профессиональная гигиена оплачивается отдельно.</p><details class="aftercare-guarantee"><summary>Гарантия 1 год: условия</summary><p>Гарантия 1 год на стабильность имплантата и несъёмные ортопедические конструкции действует при соблюдении условий договора:</p><ul><li>Выполнять план лечения и рекомендации врача.</li><li>Проходить осмотр и профессиональную гигиену раз в 6 месяцев в любой клинике «Премьер».</li><li>Соблюдать ежедневную гигиену.</li><li>Получать стоматологическую помощь по этому лечению только в сети «Премьер».</li></ul><p>При признанном гарантийном случае замена имплантата и повторная операция бесплатны.</p></details>${conversionCta(prefix,{context:implantology?'Консультация по имплантации':'Консультация ортопеда',implantology})}</section>`;
}
