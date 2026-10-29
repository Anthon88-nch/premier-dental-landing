// «Премьер» — лендинг имплантации: смета, выбор системы, окно записи, мессенджеры, нижняя панель.
// Без библиотек. Ссылки на мессенджеры берутся из ../site-config.js (content/contact-channels.mjs).
(() => {
  'use strict';

  // Цены лендинга. Тест tests/lp.test.mjs сверяет их с текстом страницы при каждой сборке.
  // «Под ключ» = имплантат + абатмент и формирователь + коронка из своей лаборатории.
  // Абатмент и формирователь (17 500 ₽) — остаток от 55 500 ₽ за вычетом импланта Osstem и коронки;
  // для Dentium и Astra Tech взят тот же — уточнить у клиники (см. lp/README.md).
  const PRICES = /*prices:start*/{
    "implant": { "osstem": 18000, "dentium": 30000, "astra": 66000 },
    "parts": { "osstem": 17500, "dentium": 17500, "astra": 17500 },
    "crown": 20000,
    "extraction": 0,
    "immediate": 9500,
    "allOn4From": 300000,
    "life": { "osstem": 5, "dentium": 15, "astra": 30 },
    "installmentMonths": 12,
    "refundRate": 0.13,
    "refundCap": 19500
  }/*prices:end*/;

  const IMPLANT_NAMES = { osstem: 'Osstem', dentium: 'Dentium', astra: 'Astra Tech' };
  const MAX_TEETH = 3;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const nf = new Intl.NumberFormat('ru-RU');
  const num = n => nf.format(n).replace(/[ \s]/g, ' '); // разряды — узкий неразрывный пробел
  const rub = n => `${num(n)} ₽`;
  const plural = (n, one, few, many) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
  const state = { count: 1, implant: 'osstem', extraction: false, immediate: false, touched: false };

  function estimate() {
    const n = state.count, sys = state.implant;
    const rows = [
      { name: `Имплантат ${IMPLANT_NAMES[sys]}`, qty: n, sum: PRICES.implant[sys] * n },
      { name: 'Абатмент и формирователь', qty: n, sum: PRICES.parts[sys] * n },
      { name: 'Коронка — своя лаборатория', qty: n, sum: PRICES.crown * n }
    ];
    if (state.extraction) rows.push({ name: 'Удаление зуба — бесплатно', qty: n, sum: PRICES.extraction * n, free: true });
    if (state.immediate) rows.push({ name: 'Одномоментная установка', qty: n, sum: PRICES.immediate * n });
    return { rows, total: rows.reduce((acc, row) => acc + row.sum, 0) };
  }

  function summaryText() {
    const { total } = estimate();
    const n = state.count;
    const extras = [state.extraction && 'удаление зуба', state.immediate && 'одномоментно'].filter(Boolean);
    return `${n} ${plural(n, 'зуб', 'зуба', 'зубов')} под ключ на имплантате ${IMPLANT_NAMES[state.implant]}`
      + (extras.length ? ` (${extras.join(', ')})` : '')
      + ` — ${num(total)} ₽`;
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

    // Одномоментная установка возможна только вместе с удалением зуба
    $('input[name="extraction"]', form).checked = state.extraction;
    $('input[name="immediate"]', form).checked = state.immediate;
    const radio = $(`input[name="implant"][value="${state.implant}"]`, form);
    if (radio) radio.checked = true;

    // Количество зубов
    $('[data-count]', form).textContent = String(state.count);
    $('[data-step="-1"]', form).disabled = state.count <= 1;
    $('[data-step="1"]', form).disabled = state.count >= MAX_TEETH;

    // Спецификация
    const { rows, total } = estimate();
    $('[data-spec-rows]', calc).replaceChildren(...rows.map((row, i) => {
      const tr = document.createElement('tr');
      [String(i + 1), row.name, String(row.qty), num(row.sum)].forEach((text, col) => {
        const td = document.createElement('td');
        td.textContent = text;
        // На узком экране колонка «Кол.» скрыта — количество дописываем к названию
        if (col === 1 && row.qty > 1) {
          const qty = document.createElement('span');
          qty.className = 'spec__qty';
          qty.textContent = ` × ${row.qty}`;
          td.append(qty);
        }
        if (col === 3 && row.free) td.classList.add('is-free');
        tr.append(td);
      });
      return tr;
    }));
    const totalEl = $('[data-total]', calc);
    const totalText = rub(total);
    if (totalEl.textContent !== totalText) {
      totalEl.textContent = totalText;
      redrawPencil(totalEl.closest('.spec__total-sum'));
    }
    $('[data-monthly]', calc).textContent = `от ${rub(Math.ceil(total / PRICES.installmentMonths))} в месяц`;
    $('[data-refund]', calc).textContent = `до ${rub(Math.min(Math.round(total * PRICES.refundRate), PRICES.refundCap))}`;

    updateMessengerLinks();
  }

  if (calc) {
    const form = $('[data-calc-form]', calc);
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('change', event => {
      const input = event.target;
      if (input.name === 'implant') state.implant = input.value;
      if (input.name === 'extraction') {
        state.extraction = input.checked;
        if (!input.checked) state.immediate = false;
      }
      if (input.name === 'immediate') {
        state.immediate = input.checked;
        if (input.checked) state.extraction = true;
      }
      state.touched = true;
      renderCalc();
    });
    $$('[data-step]', form).forEach(button => button.addEventListener('click', () => {
      state.count = Math.min(MAX_TEETH, Math.max(1, state.count + Number(button.dataset.step)));
      state.touched = true;
      renderCalc();
    }));
  }

  // «Посчитать с Osstem / Dentium / Astra Tech» в сравнении систем: выбираем систему и ведём к смете
  document.addEventListener('click', event => {
    const pick = event.target.closest?.('[data-pick-implant]');
    if (!pick || !calc || !PRICES.implant[pick.dataset.pickImplant]) return;
    event.preventDefault();
    state.implant = pick.dataset.pickImplant;
    state.touched = true;
    renderCalc();
    calc.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    $(`input[name="implant"][value="${state.implant}"]`, calc)?.focus({ preventScroll: true });
  });

  // «Смотреть, как наш техник делает коронки»: прокрутить к видео и сразу включить его
  document.addEventListener('click', event => {
    const link = event.target.closest?.('[data-play-video]');
    if (!link) return;
    const figure = document.querySelector(link.getAttribute('href'));
    const video = figure?.querySelector('video');
    if (!video) return;
    event.preventDefault();
    figure.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    video.play().catch(() => {}); // если браузер не даст запустить — останется кнопка «Play»
  });

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

  /* ---------- Чертёж и пульс: анимация при появлении ---------- */
  const live = $$('.sheet, [data-live]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-live'); io.unobserve(entry.target); }
    }), { threshold: 0.3 });
    live.forEach(el => io.observe(el));
  } else {
    live.forEach(el => el.classList.add('is-live'));
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
