// Правка прямо на странице. Вошедший в админку редактор включает «Режим редактирования»
// в плашке EmDash на сайте — и тексты, цены, подписи получают атрибут data-pe:
// в какой записи CMS и по какому пути лежит значение. Редактор — components/EditKit.astro.
// Вне режима правки (у посетителей) атрибутов нет.
import type { Doctor, Implant, Site } from "./site";

export type EditKind = "line" | "text" | "int" | "num";
export type EditPath = Array<string | number>;

export interface EditOptions {
	/** line — строка, text — многострочный текст, int/num — число */
	t?: EditKind;
	/** номер строки в многострочном поле (часы работы, условия гарантии) */
	ln?: number;
	/** после сохранения перезагрузить страницу: значение влияет и на другие места */
	reload?: boolean;
	/** показать в редакторе это значение вместо прочитанного по пути */
	raw?: unknown;
}

type Attrs = Record<string, string>;
const NONE: Attrs = {};

/** EmDash отдаёт настоящий edit-прокси только редактору с включённым режимом правки. */
export function isEditMode(entry: unknown): boolean {
	const edit = (entry as { edit?: object } | null | undefined)?.edit;
	return Boolean(edit && Object.keys(edit).length > 0);
}

function at(source: unknown, path: EditPath): unknown {
	let value: any = source;
	for (const key of path) {
		if (value == null) return undefined;
		value = value[key as any];
	}
	return value;
}

function attrs(
	site: Site,
	collection: string,
	id: string | undefined,
	path: EditPath,
	stored: unknown,
	opts: EditOptions = {},
): Attrs {
	if (!site.editing || !id) return NONE;
	const value = opts.raw !== undefined ? opts.raw : stored;
	const meta: Record<string, unknown> = {
		c: collection,
		id,
		p: path,
		t: opts.t ?? "line",
		r: value == null ? "" : String(value),
	};
	if (opts.ln !== undefined) meta.ln = opts.ln;
	if (opts.reload) meta.x = 1;
	return { "data-pe": JSON.stringify(meta) };
}

/** Поля блока страницы: путь считается от блока — ["headline"], ["items", 2, "title"]. */
export function blockEditor(site: Site, block: Record<string, any>) {
	return (path: EditPath, opts?: EditOptions): Attrs =>
		attrs(site, "pages", site.pageId, ["content", `#${block._key}`, ...path], at(block, path), opts);
}

/** Поля записи «Клиника». */
export function clinicEdit(site: Site, path: EditPath, opts?: EditOptions): Attrs {
	return attrs(site, "clinic", site.clinicId, path, at(site.clinic, path), opts);
}

export function implantEdit(site: Site, implant: Implant | undefined, field: string, opts?: EditOptions): Attrs {
	return implant ? attrs(site, "implants", implant.id, [field], implant.data[field], opts) : NONE;
}

export function doctorEdit(site: Site, doctor: Doctor, field: string, opts?: EditOptions): Attrs {
	return attrs(site, "doctors", doctor.id, [field], doctor.data[field], opts);
}

/** Значение считается само: в режиме правки клик покажет, откуда оно берётся. */
export function infoEdit(site: Site, text: string): Attrs {
	return site.editing ? { "data-pe-info": text } : NONE;
}

/** Правится только в админке (фото, меню): в режиме правки клик откроет нужную страницу админки. */
export function adminLink(site: Site, path: string, hint: string): Attrs {
	return site.editing ? { "data-pe-open": path, title: hint } : NONE;
}

export const TURNKEY_INFO =
	"Цена зуба под ключ считается сама: имплантат + абатмент + коронка. Меняйте цену имплантата в карточках систем, коронки — в блоке лаборатории, абатмента — на чертеже в первом экране.";
