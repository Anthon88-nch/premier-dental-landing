// Stops a production release while editorial placeholders ({{TODO: …}}) are still on the pages.
// Preview builds keep them visible on purpose, so the clinic can see what is still missing.
const placeholder = /\{\{\s*TODO\b[^}]*\}\}/g;

export const findPlaceholders = html => [...html.matchAll(placeholder)].map(match => match[0]);

export function assertNoPlaceholders(pages) {
  const problems = pages.flatMap(({file, html}) => findPlaceholders(html).map(text => `  ${file}: ${text}`));
  if(problems.length) {
    throw new Error(`Продакшен-сборка остановлена: на страницах осталось заглушек — ${problems.length}. Заполните их данными клиники:\n${problems.join('\n')}`);
  }
}
