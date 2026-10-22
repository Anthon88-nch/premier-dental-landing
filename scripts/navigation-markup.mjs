import {pages} from '../content/services.mjs';
import {escapeHtml as e} from './page-shell.mjs';

export function desktopNavigation() {
  const order=['odnomomentnaya-implantaciya','all-on-4','all-on-6','ortoped','dentium','astra-tech'];
  const links=order.map(slug=>pages.find(page=>page.slug===slug)).map(page=>`<a href="services/${page.slug}/">${e(page.label)}</a>`).join('');
  return `<nav class="desktop-nav" aria-label="Главное меню"><div class="nav-services"><a href="services/">Услуги</a><button class="nav-services-toggle" type="button" aria-label="Показать услуги" aria-expanded="false" aria-controls="services-dropdown"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg></button><div class="services-dropdown" id="services-dropdown" hidden>${links}<a class="services-dropdown-all" href="services/">Все услуги <span aria-hidden="true">→</span></a></div></div><a href="doctors/">Врачи</a><a href="#cost">Стоимость</a><a href="reviews/">Отзывы</a><a href="blog/">Блог</a><a href="#contacts">Контакты</a></nav>`;
}
