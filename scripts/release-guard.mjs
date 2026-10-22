// Stops a production release while demo data is still on the site:
// {{TODO: …}} placeholders, demo figures marked with data-draft, and empty messenger links.
// Preview builds keep all of them visible on purpose, so the clinic can see what is still missing.
const placeholder = /\{\{\s*TODO\b[^}]*\}\}/g;
const draftValue = /<[^>]*\bdata-draft\b[^>]*>([^<]*)/g;
const requiredChannels = {telegram:'Telegram', max:'MAX'};

export const findPlaceholders = html => [
  ...[...html.matchAll(placeholder)].map(match => match[0]),
  ...[...html.matchAll(draftValue)].map(match => `черновое значение «${match[1].trim()}»`)
];

export const missingChannels = (channels = {}) => Object.entries(requiredChannels)
  .filter(([key]) => typeof channels[key] !== 'string' || !channels[key].trim())
  .map(([, label]) => label);

export function assertNoPlaceholders(pages, {channels} = {}) {
  const problems = pages.flatMap(({file, html}) => findPlaceholders(html).map(text => `  ${file}: ${text}`));
  if(channels)problems.push(...missingChannels(channels).map(label => `  content/contact-channels.mjs: нет ссылки ${label}`));
  if(problems.length) {
    throw new Error(`Продакшен-сборка остановлена: на сайте остались демонстрационные данные — ${problems.length}. Замените их данными клиники (черновые значения — в content/draft-values.mjs):\n${problems.join('\n')}`);
  }
}
