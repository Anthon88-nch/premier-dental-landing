(() => {
  'use strict';
  const config = window.PREMIER_CONFIG?.analytics;
  const location = window.location;
  const local = /^(?:localhost|.*\.localhost|127(?:\.\d+){3}|0\.0\.0\.0|\[?::1\]?)$/i.test(location.hostname);
  const privatePage = /\/(?:admin|login)(?:\/|\.html?$|$)/i.test(location.pathname);
  const active = config?.enabled === true && Number.isSafeInteger(config.metrikaId) && config.metrikaId > 0
    && location.protocol === 'https:' && !local && !privatePage;
  const goals = new Set(['phone_click','messenger_click','lead_submit']);
  // No form fields, contact details, doctor or treatment names are sent as parameters.
  function goal(name) {
    if(!active || !goals.has(name) || typeof window.ym !== 'function') return false;
    try { window.ym(config.metrikaId,'reachGoal',name); return true; }
    catch { return false; }
  }
  window.PREMIER_ANALYTICS = Object.freeze({goal});
  if(!active) return;
  // Official asynchronous queue; a blocked tag never blocks booking or navigation.
  window.ym = window.ym || function() { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Number(new Date());
  if(!document.querySelector('script[src="https://mc.yandex.ru/metrika/tag.js"]')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.append(script);
  }
  window.ym(config.metrikaId,'init',{clickmap:false,trackLinks:false,accurateTrackBounce:true,webvisor:false,sendTitle:false});
  document.addEventListener('click',event => {
    if(event.defaultPrevented) return;
    const link = event.target?.closest?.('a[href]');
    if(!link) return;
    const href = link.getAttribute('href') || '';
    if(/^tel:/i.test(href)) goal('phone_click');
    else if(link.hasAttribute('data-messenger') && /^(?:https:\/\/|tg:|whatsapp:|viber:)/i.test(href)) goal('messenger_click');
  });
})();
