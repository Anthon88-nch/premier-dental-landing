/**
 * EmDash Live Content Collections — все коллекции из базы идут через одну _emdash.
 * Запросы: getEmDashCollection("implants"), getEmDashEntry("pages", "home").
 */
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
	_emdash: defineLiveCollection({ loader: emdashLoader() }),
};
