const icon = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
const chat = icon('<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 10h9M7 14h6"/>');
const phone = icon('<path d="m7 3 3 5-2.5 2a15 15 0 0 0 6.5 6.5L16 14l5 3-.8 3.2a1 1 0 0 1-1.1.8C10.6 20.2 3.8 13.4 3 4.9a1 1 0 0 1 .8-1.1L7 3Z"/>');
const close = icon('<path d="m6 6 12 12M18 6 6 18"/>');
const arrow = icon('<path d="M6 18 18 6M6 6h12v12"/>');

// app.js supplies only confirmed messenger destinations from PREMIER_CONFIG.
export function contactWidget() {
  return `<aside class="contact-widget" aria-label="Связь с клиникой">
  <button class="contact-widget__toggle" type="button" aria-expanded="false" aria-controls="contact-widget-panel"><span class="contact-widget__toggle-chat">${chat}</span><span class="contact-widget__toggle-close">${close}</span><span>Связаться</span></button>
  <div class="contact-widget__panel" id="contact-widget-panel" aria-labelledby="contact-widget-title" hidden>
    <div class="contact-widget__heading"><p id="contact-widget-title">Связаться с клиникой</p><button class="contact-widget__close" type="button" data-contact-close aria-label="Закрыть способы связи">${close}</button></div>
    <div class="contact-widget__links">
      <a class="contact-widget__link" data-messenger="whatsapp" hidden target="_blank" rel="noopener noreferrer"><span class="contact-widget__icon">${chat}</span><span>WhatsApp</span>${arrow}</a>
      <a class="contact-widget__link" data-messenger="max" hidden target="_blank" rel="noopener noreferrer"><span class="contact-widget__icon">${chat}</span><span>MAX</span>${arrow}</a>
      <a class="contact-widget__link" data-messenger="telegram" hidden target="_blank" rel="noopener noreferrer"><span class="contact-widget__icon">${icon('<path d="m21 3-6 18-4-8-8-4 18-6Z"/><path d="m11 13 5-5"/>')}</span><span>Telegram</span>${arrow}</a>
      <a class="contact-widget__link" href="tel:+78552529090"><span class="contact-widget__icon">${phone}</span><span>Позвонить<small>+7 (8552) 52-90-90</small></span>${arrow}</a>
    </div>
  </div>
</aside>`;
}
