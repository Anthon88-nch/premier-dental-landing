// Demo values for the preview site. They are NOT the clinic's figures:
// averaged for Naberezhnye Chelny dental clinics in October 2026, to be replaced before production.
//
// How to release: replace each value with the clinic's confirmed figure and set `confirmed: true`.
// While `confirmed` is false every value is rendered with a data-draft attribute, and
// `node scripts/build-pages.mjs --production` stops with a list of them.
//
// Sources for the averages (checked 22.10.2026):
// - metal-ceramic crown "from" prices of 19 Chelny clinics on doctu.ru: median ≈ 7 000 ₽, mean ≈ 8 600 ₽,
//   the Pushkina 4 clinic itself is listed from 9 000 ₽;
// - instalments: city clinics advertise interest-free instalments without stating terms, so the common
//   market offer (0 %, up to 12 months) is applied to the cheapest implant plan (55 500 ₽ / 12);
// - stage timings: typical two-stage protocol published by Chelny clinics (consultation about an hour,
//   diagnostics up to a week, surgery up to an hour, 3–6 months of healing); follow-up dates are the clinic's own.
export const draftValues = Object.freeze({
  confirmed: false,
  orthopedicFrom: 'от 9 000 ₽',
  installment: 'Рассрочка 0% до 12 месяцев — от 4 625 ₽/мес',
  stepTimes: Object.freeze([
    '1 визит, около часа',
    'До 7 дней после диагностики',
    'Операция — до 1 часа, приживление 3–6 месяцев',
    'Швы — через 10 дней, затем осмотр раз в 6 месяцев'
  ])
});
