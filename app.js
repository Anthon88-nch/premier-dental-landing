// Only confirmed destinations become links. In preview builds a blank Telegram/MAX channel is shown
// as an inactive button (no href) so the layout is final; production builds hide it and refuse to ship blanks.
const channelHosts = {whatsapp:['wa.me'],telegram:['t.me','telegram.me'],max:['max.ru']};
const configuredChannels = window.PREMIER_CONFIG?.messengers || {};
const showPlaceholders = window.PREMIER_CONFIG?.messengerPlaceholders === true;
for(const link of document.querySelectorAll('[data-messenger]')) {
  const channel = link.getAttribute('data-messenger');
  if(!Object.hasOwn(channelHosts,channel)) continue;
  link.hidden = true;
  link.removeAttribute('href');
  link.classList?.remove('is-placeholder');
  link.removeAttribute('aria-disabled');
  const value = configuredChannels[channel];
  if(typeof value !== 'string' || !value.trim()) {
    if(showPlaceholders && channel !== 'whatsapp') {
      link.hidden = false;
      link.classList?.add('is-placeholder');
      link.setAttribute('aria-disabled','true');
      link.title = 'Ссылка появится после запуска сайта';
    }
    continue;
  }
  try {
    const target = new URL(value.trim());
    if(target.protocol !== 'https:' || target.username || target.password
      || !channelHosts[channel].includes(target.hostname) || target.port || target.pathname === '/') continue;
    link.setAttribute('href',target.href);
    link.hidden = false;
  } catch { /* An invalid destination remains hidden. */ }
}

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const booking = document.querySelector('#booking');
const privacy = document.querySelector('#privacy');
const form = document.querySelector('#booking-form');
const phone = document.querySelector('#phone');
const error = document.querySelector('#form-error');
let trigger;
let requestId = '';
let requestFingerprint = '';
let submitting = false;
const phoneOnly = window.PREMIER_CONFIG?.bookingMode === 'phone';
if(phoneOnly) {
  form.hidden = true;
  const intro = document.querySelector('.dialog-desc');
  intro.textContent = 'Позвоните в клинику: администратор ответит на вопросы и согласует удобное время консультации.';
  const call = document.createElement('a');
  call.className = 'button button-dark booking-accent';
  call.href = 'tel:+78552529090';
  call.innerHTML = '+7 (8552) 52-90-90 <svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg>';
  intro.after(call);
}

function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
  mobileMenu.hidden = true;
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileMenu.hidden = !open;
});
mobileMenu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeMenu(); });

// A normal site-navigation disclosure: links keep their usual browser behaviour.
for(const disclosure of document.querySelectorAll('.nav-services')) {
  const toggle=disclosure.querySelector('.nav-services-toggle');
  const panel=disclosure.querySelector('.services-dropdown');
  const desktop=window.matchMedia('(min-width:1101px)');
  function setServicesOpen(open) {
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Скрыть услуги':'Показать услуги');
    panel.hidden=!open;
  }
  toggle.addEventListener('click',()=>setServicesOpen(toggle.getAttribute('aria-expanded')!=='true'));
  disclosure.addEventListener('pointerenter',event=>{
    if(desktop.matches && event.pointerType==='mouse')setServicesOpen(true);
  });
  disclosure.addEventListener('pointerleave',()=>{
    if(!disclosure.contains(document.activeElement))setServicesOpen(false);
  });
  disclosure.addEventListener('focusin',event=>{if(event.target!==toggle)setServicesOpen(true);});
  disclosure.addEventListener('focusout',event=>{
    if(!disclosure.contains(event.relatedTarget))setServicesOpen(false);
  });
  disclosure.addEventListener('keydown',event=>{
    if(event.key==='Escape') {
      event.preventDefault();event.stopPropagation();setServicesOpen(false);toggle.focus({preventScroll:true});
    } else if((event.key==='ArrowDown'||event.key==='ArrowUp') && !panel.contains(event.target)) {
      event.preventDefault();setServicesOpen(true);
      const links=panel.querySelectorAll('a');
      links[event.key==='ArrowDown'?0:links.length-1].focus();
    }
  });
  panel.addEventListener('click',event=>{if(event.target.closest('a'))setServicesOpen(false);});
  document.addEventListener('click',event=>{if(!disclosure.contains(event.target))setServicesOpen(false);});
  desktop.addEventListener('change',event=>{if(!event.matches)setServicesOpen(false);});
}

document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  trigger = button;
  closeMenu();
  if (!submitting) {
    document.querySelector('#booking-content').hidden = false;
    document.querySelector('#booking-result').hidden = true;
    error.textContent = '';
  }
  document.body.classList.add('locked');
  booking.showModal();
  // Focus the dialog close button instead of opening a mobile keyboard immediately.
  booking.querySelector('[data-close]').focus({ preventScroll: true });
}));
document.querySelectorAll('[data-privacy]').forEach(button => button.addEventListener('click', () => {
  privacy.showModal();
  document.body.classList.add('locked');
}));
for (const dialog of [booking, privacy]) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if(event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if(!booking.open && !privacy.open) document.body.classList.remove('locked');
    if(dialog === booking && trigger) trigger.focus({ preventScroll: true });
  });
}
const phoneError = 'Проверьте номер: введите 10 цифр после +7, без букв и добавочных номеров.';
// Keep invalid input visible instead of silently cutting off a second number or letters.
phone.removeAttribute('maxlength');
function normalizePhone(value) {
  const raw = value.trim();
  if(!/^\+?[\d\s()-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if(digits.length === 10 && !raw.startsWith('+')) return `7${digits}`;
  if(digits.length === 11 && /^[78]/.test(digits) && (!raw.startsWith('+') || digits.startsWith('7'))) return `7${digits.slice(1)}`;
  return null;
}
function partialPhone(value) {
  const raw = value.trim();
  if(!raw) return {national:'',prefix:0};
  if(!/^\+?[\d\s()-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if(!digits || digits.length > 11 || (raw.startsWith('+') && !digits.startsWith('7'))) return null;
  const normalized = normalizePhone(raw);
  if(normalized) return {national:normalized.slice(1),prefix:digits.length === 11 ? 1 : 0};
  const prefix = raw.startsWith('+') || /^[78]/.test(digits) ? 1 : 0;
  const national = digits.slice(prefix);
  return national.length <= 10 ? {national,prefix} : null;
}
function formatPhone(national) {
  let result = '+7';
  if(national.length) result += ` (${national.slice(0,3)}`;
  if(national.length >= 3) result += ')';
  if(national.length > 3) result += ` ${national.slice(3,6)}`;
  if(national.length > 6) result += `-${national.slice(6,8)}`;
  if(national.length > 8) result += `-${national.slice(8,10)}`;
  return result;
}
function formatPhoneInput() {
  error.textContent = '';
  const raw = phone.value;
  if(!raw) { phone.setCustomValidity(''); return; }
  const parts = partialPhone(raw);
  if(!parts) { phone.setCustomValidity(phoneError); return; }
  const cursor = phone.selectionStart ?? raw.length;
  const beforeCursor = Math.max(0,raw.slice(0,cursor).replace(/\D/g,'').length - parts.prefix);
  phone.value = formatPhone(parts.national);
  let seen = -1,position = phone.value.length;
  if(beforeCursor === 0) position = 2;
  else for(let i=0;i<phone.value.length;i++) {
    if(/\d/.test(phone.value[i])) seen++;
    if(seen === beforeCursor) { position = i+1; break; }
  }
  phone.setSelectionRange(position,position);
  phone.setCustomValidity(normalizePhone(phone.value) ? '' : phoneError);
}
phone.addEventListener('focus', () => {
  if(!phone.value) { phone.value = '+7'; phone.setSelectionRange(2,2); }
});
phone.addEventListener('input',formatPhoneInput);
phone.addEventListener('blur', () => {
  if(phone.value === '+7') phone.value = '';
  formatPhoneInput();
});
phone.addEventListener('paste', event => {
  const pasted = event.clipboardData?.getData('text');
  if(typeof pasted !== 'string') return;
  event.preventDefault();
  const start = phone.selectionStart ?? 0,end = phone.selectionEnd ?? phone.value.length;
  const onlyPrefix = !phone.value || /^\+?7\s*$/.test(phone.value);
  // A full number pasted into an empty field replaces the +7 hint.
  phone.value = onlyPrefix || (start === 0 && end === phone.value.length)
    ? pasted : phone.value.slice(0,start)+pasted+phone.value.slice(end);
  phone.setSelectionRange((onlyPrefix ? 0 : start)+pasted.length,(onlyPrefix ? 0 : start)+pasted.length);
  formatPhoneInput();
});
phone.addEventListener('beforeinput', event => {
  if(!['deleteContentBackward','deleteContentForward'].includes(event.inputType)) return;
  if(!partialPhone(phone.value)) return; // Let users erase invalid pasted text normally.
  const start = phone.selectionStart,end = phone.selectionEnd;
  if(start !== end || start === null) return;
  const backward = event.inputType === 'deleteContentBackward';
  let index = backward ? start-1 : start;
  // Skip mask punctuation when deleting, so Backspace and Delete remove a digit.
  while(index >= 0 && index < phone.value.length && !/\d/.test(phone.value[index])) index += backward ? -1 : 1;
  if(index < 0 || index >= phone.value.length) return;
  if(index === 1 && phone.value.startsWith('+7')) {
    event.preventDefault();
    if(backward) {
      if(phone.value === '+7') { phone.value = ''; formatPhoneInput(); }
      else phone.setSelectionRange(2,2);
      return;
    }
    index = 2;
    while(index < phone.value.length && !/\d/.test(phone.value[index])) index++;
    if(index === phone.value.length) return;
    phone.value = phone.value.slice(0,index)+phone.value.slice(index+1);
    phone.setSelectionRange(index,index);
    formatPhoneInput();
    return;
  }
  if(index !== (backward ? start-1 : start)) {
    event.preventDefault();
    phone.value = phone.value.slice(0,index)+phone.value.slice(index+1);
    phone.setSelectionRange(index,index);
    formatPhoneInput();
  }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if(phoneOnly) return;
  if(submitting) return;
  const digits = normalizePhone(phone.value);
  if(!digits) {
    error.textContent = phoneError;
    phone.setCustomValidity(phoneError);
    phone.focus();
    return;
  }
  if(!form.reportValidity()) return;
  submitting = true;
  error.textContent = '';
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  submit.textContent = 'Отправляем…';
  const fingerprint = digits + '|' + form.elements.name.value.trim();
  if(fingerprint !== requestFingerprint) { requestId = ''; requestFingerprint = fingerprint; }
  requestId ||= crypto.randomUUID();
  try {
    const response = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ name: form.elements.name.value.trim(), phone: `+${digits}`, consent: form.elements.consent.checked, website: form.elements.website.value, requestId })
    });
    const result = await response.json();
    if(!response.ok || typeof result.preview !== 'boolean') throw new Error(result.message || 'Не удалось подтвердить получение заявки. Попробуйте ещё раз или позвоните в клинику.');
    document.querySelector('#booking-content').hidden = true;
    document.querySelector('#booking-result').hidden = false;
    document.querySelector('#booking-result h2').textContent = result.preview ? 'Заявка сохранена' : 'Заявка получена';
    document.querySelector('#result-message').textContent = result.preview
      ? 'Заявка сохранена в локальной версии и не передана в клинику. Для записи на приём позвоните по номеру +7 (8552) 52-90-90.'
      : 'Заявка получена. Администратор свяжется с вами для согласования времени. Запись будет подтверждена после разговора.';
    if(result.preview === false) window.PREMIER_ANALYTICS?.goal('lead_submit');
    document.querySelector('#booking-result').setAttribute('tabindex','-1');
    document.querySelector('#booking-result').focus({preventScroll:true});
    form.reset();
    requestId = '';
    booking.scrollTop = 0;
  } catch(e) {
    error.textContent = e.name === 'TimeoutError' ? 'Ответ задерживается. Попробуйте ещё раз или позвоните в клинику.' : (e instanceof TypeError ? 'Нет связи с сервером. Попробуйте ещё раз или позвоните в клинику.' : e.message);
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.innerHTML = 'Оставить заявку <span class="arrow"><svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg></span>';
  }
});

// Promotion is hidden automatically after its published end date (Europe/Moscow).
const offer = document.querySelector('#offer');
if(offer && Date.now() >= Date.parse('2026-10-01T00:00:00+03:00')) offer.hidden = true;
