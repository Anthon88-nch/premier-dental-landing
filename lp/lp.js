// «Премьер» — лендинг имплантации: смета, окно записи, мессенджеры, нижняя панель.
// Без библиотек. Ссылки на мессенджеры берутся из ../site-config.js (content/contact-channels.mjs).
(() => {
  'use strict';

  // Цены из брифа клиники = content/pricing.mjs. Тест tests/lp.test.mjs сверяет их при каждой сборке.
  const PRICES = /*prices:start*/{
    "implant": { "dentium": 30000, "astra": 66000 },
    "crown": { "dentium": { "mk": 25500, "zr": 35000 }, "astra": { "zr": 58000 } },
    "extraction": [3000, 10000],
    "tempCrown": { "dentium": 13800 },
    "installmentMonths": 12,
    "refundRate": 0.13,
    "refundCap": 19500
  }/*prices:end*/;

  const NAMES = {
    implant: { dentium: 'Имплантат Dentium', astra: 'Имплантат Astra Tech' },
    crown: { mk: 'Коронка — металлокерамика', zr: 'Коронка — оксид циркония' }
  };
  const MAX_TEETH = 3;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const nf = new Intl.NumberFormat('ru-RU');
  const num = n => nf.format(n).replace(/[\u00a0\s]/g, '\u202f'); // разряды — узкий неразрывный пробел
  const rub = n => `${num(n)}\u00a0₽`;
  const range = (min, max) => (min === max ? num(min) : `${num(min)}–${num(max)}`);
  // Для экрана: после тире можно перенести строку (U+200B), чтобы диапазон не распирал карточку
  const rangeWrap = (min, max) => range(min, max).replace('–', '–\u200b');
  const plural = (n, one, few, many) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };

  /* ---------- Уведомление ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer = 0;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3800);
  }

  /* ---------- Смета ---------- */
  const calc = $('[data-calc]');
  const state = { count: 1, implant: 'dentium', crown: 'mk', extraction: false, temp: false, touched: false };

  function estimate() {
    const n = state.count;
    const crownPrice = PRICES.crown[state.implant][state.crown];
    const rows = [
      { name: NAMES.implant[state.implant], qty: n, min: PRICES.implant[state.implant] * n },
      { name: NAMES.crown[state.crown], qty: n, min: crownPrice * n }
    ];
    if (state.extraction) rows.push({ name: 'Удаление зуба', qty: n, min: PRICES.extraction[0] * n, max: PRICES.extraction[1] * n });
    if (state.temp && PRICES.tempCrown[state.implant]) rows.push({ name: 'Временная коронка', qty: n, min: PRICES.tempCrown[state.implant] * n });
    rows.forEach(row => { if (row.max === undefined) row.max = row.min; });
    const min = rows.reduce((sum, row) => sum + row.min, 0);
    const max = rows.reduce((sum, row) => sum + row.max, 0);
    return { rows, min, max };
  }

  function summaryText() {
    const { min, max } = estimate();
    const n = state.count;
    const extras = [state.extraction && 'удаление зуба', state.temp && 'временная коронка'].filter(Boolean);
    const crown = state.crown === 'mk' ? 'металлокерамическая коронка' : 'коронка из оксида циркония';
    const implant = state.implant === 'dentium' ? 'Dentium' : 'Astra Tech';
    return `${n} ${plural(n, 'зуб', 'зуба', 'зубов')}: имплантат ${implant} + ${crown}`
      + (extras.length ? ` + ${extras.join(', ')}` : '')
      + ` — ${range(min, max)} ₽`;
  }

  function messageText(context) {
    const lines = ['Здравствуйте! Хочу записаться на консультацию по имплантации.'];
    if (context && !['Консультация по имплантации', 'Расчёт с сайта'].includes(context)) lines.push(`Тема: ${context}.`);
    if (state.touched || context === 'Расчёт с сайта') lines.push(`Мой расчёт с сайта: ${summaryText()}.`);
    return lines.join('\n');
  }

  function redrawPencil(el) {
    if (!el) return;
    el.classList.remove('is-redraw');
    void el.offsetWidth; // перезапуск анимации
    el.classList.add('is-redraw');
  }

  function renderCalc() {
    if (!calc) return;
    const form = $('[data-calc-form]', calc);
    const astra = state.implant === 'astra';

    // Astra Tech: только коронка из оксида циркония, цена временной коронки — у врача
    const mk = $('input[name="crown"][value="mk"]', form);
    mk.disabled = astra;
    if (astra && state.crown === 'mk') { state.crown = 'zr'; $('input[name="crown"][value="zr"]', form).checked = true; }
    $('[data-crown-price="zr"]', form).textContent = rub(PRICES.crown[state.implant].zr);
    $('[data-astra-note]', form).hidden = !astra;
    const temp = $('input[name="temp"]', form);
    temp.disabled = astra;
    if (astra) { temp.checked = false; state.temp = false; }
    $('[data-temp-price]', form).textContent = astra ? 'для Astra Tech стоимость назовёт врач' : `${rub(PRICES.tempCrown.dentium)} за зуб`;

    // Количество зубов
    $('[data-count]', form).textContent = String(state.count);
    $('[data-step="-1"]', form).disabled = state.count <= 1;
    $('[data-step="1"]', form).disabled = state.count >= MAX_TEETH;

    // Спецификация
    const { rows, min, max } = estimate();
    const body = $('[data-spec-rows]', calc);
    body.replaceChildren(...rows.map((row, i) => {
      const tr = document.createElement('tr');
      [String(i + 1), row.name, String(row.qty), rangeWrap(row.min, row.max)].forEach((text, col) => {
        const td = document.createElement('td');
        td.textContent = text;
        // На узком экране колонка «Кол.» скрыта — количество дописываем к названию
        if (col === 1 && row.qty > 1) {
          const qty = document.createElement('span');
          qty.className = 'spec__qty';
          qty.textContent = ` × ${row.qty}`;
          td.append(qty);
        }
        tr.append(td);
      });
      return tr;
    }));
    const total = $('[data-total]', calc);
    const totalText = min === max ? rub(min) : `${rangeWrap(min, max)}\u00a0₽`;
    total.classList.toggle('is-range', min !== max);
    if (total.textContent !== totalText) {
      total.textContent = totalText;
      redrawPencil(total.closest('.spec__total-sum'));
    }
    const monthly = Math.ceil(min / PRICES.installmentMonths);
    $('[data-monthly]', calc).textContent = `от ${rub(monthly)} в месяц`;
    const refund = Math.min(Math.round(min * PRICES.refundRate), PRICES.refundCap);
    $('[data-refund]', calc).textContent = `до ${rub(refund)}`;

    updateMessengerLinks();
  }

  if (calc) {
    const form = $('[data-calc-form]', calc);
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('change', event => {
      const input = event.target;
      if (input.name === 'implant') state.implant = input.value;
      if (input.name === 'crown') state.crown = input.value;
      if (input.name === 'extraction') state.extraction = input.checked;
      if (input.name === 'temp') state.temp = input.checked;
      state.touched = true;
      renderCalc();
    });
    $$('[data-step]', form).forEach(button => button.addEventListener('click', () => {
      state.count = Math.min(MAX_TEETH, Math.max(1, state.count + Number(button.dataset.step)));
      state.touched = true;
      renderCalc();
    }));
  }

  /* ---------- Мессенджеры ---------- */
  const channels = (() => {
    const source = window.PREMIER_CONFIG?.messengers || {};
    const safe = value => (typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value.trim()) ? value.trim() : '');
    return { whatsapp: safe(source.whatsapp), telegram: safe(source.telegram), max: safe(source.max) };
  })();
  const LABELS = { whatsapp: 'WhatsApp', telegram: 'Telegram', max: 'MAX' };
  let bookContext = 'Консультация по имплантации';

  function whatsappHref(text) {
    if (!channels.whatsapp) return '';
    // encodeURIComponent, а не URLSearchParams: WhatsApp не понимает «+» как пробел
    const base = channels.whatsapp.replace(/[?#].*$/, '');
    return `${base}?text=${encodeURIComponent(text)}`;
  }

  function buildMessengers() {
    const available = Object.keys(LABELS).filter(key => channels[key]);
    $$('[data-messengers]').forEach(box => {
      box.replaceChildren(...available.map(key => {
        const link = document.createElement('a');
        link.className = 'btn btn--line btn--sm';
        link.dataset.messenger = key;
        link.target = '_blank';
        link.rel = 'noopener';
        link.href = channels[key];
        link.textContent = LABELS[key];
        if (key !== 'whatsapp') {
          link.addEventListener('click', () => {
            const text = messageText(bookContext);
            navigator.clipboard?.writeText(text).then(
              () => toast(`Текст сообщения скопирован — вставьте его в чат ${LABELS[key]}.`),
              () => {}
            );
          });
        }
        return link;
      }));
    });
    const row = $('[data-messengers-row]');
    if (row) row.hidden = available.length === 0;
    const specWa = $('[data-messenger-wa]');
    if (specWa) {
      specWa.hidden = !channels.whatsapp;
      specWa.setAttribute('data-messenger', 'whatsapp');
      specWa.target = '_blank';
      specWa.rel = 'noopener';
    }
    updateMessengerLinks();
  }

  function updateMessengerLinks() {
    if (!channels.whatsapp) return;
    $$('a[data-messenger="whatsapp"]').forEach(link => {
      const fromCalc = link.hasAttribute('data-messenger-wa');
      link.href = whatsappHref(messageText(fromCalc ? 'Расчёт с сайта' : bookContext));
    });
  }

  /* ---------- Окно записи ---------- */
  const dialog = $('#book');
  const contextEl = $('[data-book-context]');
  function openBooking(context) {
    bookContext = context || 'Консультация по имплантации';
    if (contextEl) {
      const show = bookContext !== 'Консультация по имплантации';
      contextEl.hidden = !show;
      contextEl.textContent = show ? `Тема: ${bookContext}` : '';
    }
    updateMessengerLinks();
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      // Старые браузеры: просто ведём к контактам
      document.getElementById('kontakty')?.scrollIntoView();
    }
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-book]');
    if (!trigger) return;
    event.preventDefault();
    openBooking(trigger.dataset.book);
  });
  if (dialog) {
    // Клик по подложке закрывает окно
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { bookContext = 'Консультация по имплантации'; updateMessengerLinks(); });
  }

  /* ---------- Чертёж: анимация при появлении ---------- */
  const sheets = $$('.sheet');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-live'); io.unobserve(entry.target); }
    }), { threshold: 0.3 });
    sheets.forEach(sheet => io.observe(sheet));
  } else {
    sheets.forEach(sheet => sheet.classList.add('is-live'));
  }

  /* ---------- Шапка и нижняя панель ---------- */
  const head = $('[data-head]');
  const onScroll = () => head?.classList.toggle('is-stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const dock = $('[data-dock]');
  const heroActions = $('[data-hero-actions]');
  const contacts = document.getElementById('kontakty');
  if (dock && heroActions && 'IntersectionObserver' in window) {
    dock.hidden = false;
    let heroVisible = true, contactsVisible = false;
    const sync = () => dock.classList.toggle('is-on', !heroVisible && !contactsVisible);
    new IntersectionObserver(([entry]) => {
      // Панель нужна, только когда кнопки первого экрана ушли вверх
      heroVisible = entry.isIntersecting || entry.boundingClientRect.top > 0;
      sync();
    }).observe(heroActions);
    if (contacts) new IntersectionObserver(([entry]) => { contactsVisible = entry.isIntersecting; sync(); }, { threshold: 0.15 }).observe(contacts);
  }

  buildMessengers();
  renderCalc();
})();
