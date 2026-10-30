// Заголовок и описание страницы для поиска и соцсетей.
// Порядок: SEO-панель записи в админке → поля «SEO главной» в «Клинике» → название.
import { getContentSeo } from "emdash";
import type { Site } from "./site";
import { plain } from "./text";

export function pageSeo(page: any, site: Site, isHome: boolean) {
	const panel = page ? getContentSeo(page) : undefined;
	const t = (text: unknown) => plain(text, site.tokens);
	const clinicName = t(site.clinic.clinic_name) || "Стоматология «Премьер»";
	const pageTitle = page ? t(page.data.title) : "";
	const title =
		panel?.title || (isHome ? t(site.clinic.seo_title) : pageTitle && `${pageTitle} | ${clinicName}`) || clinicName;
	const description = panel?.description || (isHome ? t(site.clinic.seo_description) : "") || undefined;
	return {
		title,
		description,
		ogTitle: panel?.title || (isHome ? t(site.clinic.og_title) : "") || title,
		ogDescription: panel?.description || (isHome ? t(site.clinic.og_description) : "") || description,
		robots: site.clinic.noindex === true ? "noindex, nofollow" : undefined,
	};
}
