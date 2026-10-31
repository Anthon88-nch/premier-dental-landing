// Общие данные лендинга: «Клиника» (контакты и цены), «Импланты», «Врачи и команда».
// Отсюда же берутся токены цен ({зуб}, {коронка} …), которые можно писать в любом тексте.
import { getEmDashCollection, getEmDashEntry } from "emdash";
import seed from "../../seed/seed.json";
import { group, lines, money, plural, type Tokens } from "./text";

type Data = Record<string, any>;

export interface Implant {
	key: string;
	/** ULID записи — для правки на странице */
	id?: string;
	/** поля записи как есть */
	data: Data;
	name: string;
	country: string;
	countryShort: string;
	implant: number;
	parts: number;
	life: number;
	note: string;
	featured: boolean;
	priceFrom: boolean;
	order: number;
	/** Имплантат + абатмент и формирователь + коронка */
	turnkey: number;
}

export interface Doctor {
	key: string;
	id?: string;
	data: Data;
	name: string;
	team: string;
	role: string;
	experience: string;
	bio: string;
	photo: any;
	profileUrl: string;
	order: number;
}

export interface Site {
	/** редактор включил «Режим редактирования» — показываем атрибуты для правки на странице */
	editing: boolean;
	/** ULID текущей страницы и записи «Клиника» — для правки на странице */
	pageId?: string;
	clinicId?: string;
	clinic: Data;
	implants: Implant[];
	featured?: Implant;
	doctors: Doctor[];
	tokens: Tokens;
	crown: number;
	immediate: number;
	extraction: number;
	consultation: number;
	installmentMonths: number;
	refundCap: number;
	phoneTel: string;
	phoneDisplay: string;
	phoneShort: string;
	hours: string[];
	config: {
		bookingMode: "local";
		analytics: { enabled: boolean; metrikaId: number };
		messengers: { whatsapp: string; telegram: string; max: string };
	};
	cacheHints: unknown[];
}

export const TEAM_ORDER = ["Хирурги-имплантологи", "Ортопеды", "Зубной техник", "Анестезиолог-реаниматолог"];

const SHORT_COUNTRY: Record<string, string> = { "Южная Корея": "Корея", "Другая": "" };

const num = (value: unknown, fallback = 0): number => {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : fallback;
};
const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const https = (value: unknown): string => {
	const url = str(value);
	return /^https:\/\/\S+$/i.test(url) ? url : "";
};

const SEED_CLINIC: Data = (seed as any).content?.clinic?.[0]?.data ?? {};

function toImplant(entry: { id: string; data: Data }, crown: number): Implant {
	const d = entry.data;
	const implant = num(d.implant_price);
	const parts = num(d.parts_price);
	const country = str(d.country);
	return {
		key: entry.id,
		id: typeof d.id === "string" ? d.id : undefined,
		data: d,
		name: str(d.name) || entry.id,
		country,
		countryShort: country in SHORT_COUNTRY ? SHORT_COUNTRY[country] : country,
		implant,
		parts,
		life: num(d.service_life),
		note: str(d.note),
		featured: d.featured === true,
		priceFrom: d.price_from === true,
		order: num(d.sort_order, 999),
		turnkey: implant + parts + crown,
	};
}

function toDoctor(entry: { id: string; data: Data }): Doctor {
	const d = entry.data;
	return {
		key: entry.id,
		id: typeof d.id === "string" ? d.id : undefined,
		data: d,
		name: str(d.name),
		team: str(d.team_group),
		role: str(d.role),
		experience: str(d.experience),
		bio: str(d.bio),
		photo: d.photo ?? null,
		profileUrl: https(d.profile_url),
		order: num(d.sort_order, 999),
	};
}

/** «18, 30 и 66 тысяч» — цены имплантов в тысячах для заголовка сравнения. */
function thousands(implants: Implant[]): string {
	const values = implants.map((i) => i.implant / 1000).filter((v) => v > 0);
	if (values.length === 0) return "";
	const text = values.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",")));
	const last = values[values.length - 1];
	const word = Number.isInteger(last) ? plural(last, "тысяча", "тысячи", "тысяч") : "тысячи";
	const list = text.length === 1 ? text[0] : `${text.slice(0, -1).join(", ")} и ${text[text.length - 1]}`;
	return `${list} ${word}`;
}

export async function loadSite(): Promise<Site> {
	const [clinicResult, implantsResult, doctorsResult] = await Promise.all([
		getEmDashEntry("clinic", "main"),
		getEmDashCollection("implants", { limit: 100 }),
		getEmDashCollection("doctors", { limit: 100 }),
	]);

	const clinicEntry = clinicResult.entry as { data: Data } | null | undefined;
	if (!clinicEntry) {
		console.warn("[premier] Нет опубликованной записи «Клиника» со slug main — показываю данные из seed/seed.json");
	}
	const clinic: Data = clinicEntry?.data ?? SEED_CLINIC;

	const crown = num(clinic.crown_price);
	const immediate = num(clinic.immediate_extra);
	const extraction = num(clinic.extraction_price);
	const consultation = num(clinic.consultation_price);
	const allOn4 = num(clinic.allon4_from);
	const refundCap = num(clinic.tax_refund_cap, 19500);
	const reviews = num(clinic.reviews_count);

	const implants = ((implantsResult.entries ?? []) as Array<{ id: string; data: Data }>)
		.map((entry) => toImplant(entry, crown))
		.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ru"));
	const featured = implants.find((i) => i.featured) ?? implants[0];

	const doctors = ((doctorsResult.entries ?? []) as Array<{ id: string; data: Data }>)
		.map(toDoctor)
		.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ru"));

	const phoneDisplay = str(clinic.phone_display);
	const phoneTel = str(clinic.phone_tel).replace(/[^\d+]/g, "");
	const phoneShort = phoneDisplay.includes(")") ? phoneDisplay.split(")").pop()!.trim() : phoneDisplay;

	const tokens: Tokens = {
		"зуб": featured ? money(featured.turnkey) : "",
		"имплант": featured ? money(featured.implant) : "",
		"абатмент": featured ? money(featured.parts) : "",
		"система": featured?.name ?? "",
		"коронка": money(crown),
		"одномоментная": featured ? money(featured.turnkey + immediate) : "",
		"доплата": money(immediate),
		"консультация": money(consultation),
		"all-on-4": money(allOn4),
		"вычет": money(refundCap),
		"рассрочка": str(clinic.installment_text),
		"рейтинг": str(clinic.rating),
		"отзывы": reviews ? `${group(reviews)} ${plural(reviews, "отзыв", "отзыва", "отзывов")}` : "",
		"отзывам": reviews ? `${group(reviews)} ${reviews % 10 === 1 && reviews % 100 !== 11 ? "отзыву" : "отзывам"}` : "",
		"дата-рейтинга": str(clinic.rating_date),
		"телефон": phoneDisplay,
		"цены-тыс": thousands(implants),
	};

	const metrikaId = Number(str(clinic.metrika_id));

	return {
		editing: false,
		clinicId: typeof clinicEntry?.data?.id === "string" ? clinicEntry.data.id : undefined,
		clinic,
		implants,
		featured,
		doctors,
		tokens,
		crown,
		immediate,
		extraction,
		consultation,
		installmentMonths: Math.max(1, num(clinic.installment_months, 12)),
		refundCap,
		phoneTel,
		phoneDisplay,
		phoneShort,
		hours: lines(clinic.hours),
		config: {
			bookingMode: "local",
			analytics: {
				enabled: clinic.metrika_on === true && Number.isSafeInteger(metrikaId) && metrikaId > 0,
				metrikaId: Number.isSafeInteger(metrikaId) ? metrikaId : 0,
			},
			messengers: {
				whatsapp: https(clinic.whatsapp_url),
				telegram: https(clinic.telegram_url),
				max: https(clinic.max_url),
			},
		},
		cacheHints: [clinicResult.cacheHint, implantsResult.cacheHint, doctorsResult.cacheHint].filter(Boolean),
	};
}
