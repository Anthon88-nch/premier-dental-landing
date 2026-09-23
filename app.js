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
  call.href = 'tel:+78552597700';
  call.innerHTML = '+7 (8552) 59-77-00 <svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg>';
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
phone.addEventListener('input', () => { phone.setCustomValidity(''); error.textContent = ''; });
phone.addEventListener('blur', () => {
  const digits = phone.value.replace(/\D/g, '');
  const normalized = digits.length === 10 ? `7${digits}` : digits.replace(/^8/, '7');
  if(/^7\d{10}$/.test(normalized)) phone.value = `+7 (${normalized.slice(1,4)}) ${normalized.slice(4,7)}-${normalized.slice(7,9)}-${normalized.slice(9)}`;
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if(phoneOnly) return;
  if(submitting) return;
  let digits = phone.value.replace(/\D/g, '');
  if(digits.length === 10) digits = `7${digits}`;
  digits = digits.replace(/^8/, '7');
  if(!/^7\d{10}$/.test(digits)) {
    error.textContent = 'Проверьте номер: нужно 11 цифр, начиная с +7 или 8.';
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
    if(!response.ok) throw new Error(result.message || 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните в клинику.');
    document.querySelector('#booking-content').hidden = true;
    document.querySelector('#booking-result').hidden = false;
    document.querySelector('#result-message').textContent = result.preview
      ? 'Заявка сохранена в локальной версии и не передана в клинику. Для записи на приём позвоните по номеру +7 (8552) 59-77-00.'
      : 'Заявка получена. Администратор свяжется с вами для согласования времени. Запись будет подтверждена после разговора.';
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
if(Date.now() >= Date.parse('2026-10-01T00:00:00+03:00')) document.querySelector('#offer').hidden = true;
