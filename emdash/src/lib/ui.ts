// Мелочи разметки, общие для блоков.
import { isExternal, safeHref } from "./text";

export interface BlockProps {
	value: Record<string, any>;
	site: import("./site").Site;
	index: number;
}

/** Атрибуты ссылки «подробнее»: внешние — в новой вкладке, #video… — сразу включают видео. */
export function linkProps(url: unknown, baseClass = "more") {
	const href = safeHref(url);
	if (!href) return null;
	const external = isExternal(href);
	return {
		href,
		class: external ? `${baseClass} more--out` : baseClass,
		target: external ? "_blank" : undefined,
		rel: external ? "noopener" : undefined,
		"data-play-video": href.startsWith("#video") ? "" : undefined,
	};
}

/** id заголовка секции для aria-labelledby: уникален, даже если блок добавлен дважды. */
export function titleId(value: Record<string, any>, index: number): string {
	return `t-${String(value._key || index).replace(/[^\w-]/g, "")}`;
}

export function anchor(value: Record<string, any>): string | undefined {
	const id = typeof value.anchor_id === "string" ? value.anchor_id.trim() : "";
	return id || undefined;
}

export const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
