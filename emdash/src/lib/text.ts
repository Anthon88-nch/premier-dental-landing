// Текст из админки → HTML лендинга.
// В полях можно писать: *курсив*, **жирный**, [ссылка](#якорь) и токены цен вроде {зуб}.
// Неразрывные пробелы (после предлогов, перед тире, в числах) расставляются здесь,
// поэтому в админке текст пишется обычными пробелами.

export type Tokens = Record<string, string>;

const NBSP = "\u00A0";
const NNBSP = "\u202F"; // узкий неразрывный — разряды в числах

export function esc(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** 55500 → «55 500» с узким неразрывным пробелом. */
export function group(n: number): string {
	const value = Number.isFinite(n) ? Math.round(Math.abs(n)) : 0;
	return (n < 0 ? "−" : "") + String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

export function money(n: number): string {
	return `${group(n)}${NBSP}₽`;
}

export function plural(n: number, one: string, few: string, many: string): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return one;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
	return many;
}

/** 30.7 → «30,7». */
export function decimal(n: number): string {
	return String(Math.round(n * 10) / 10).replace(".", ",");
}

const TOKEN = /\{([\p{L}\p{N}-]+)\}/gu;

/** Подставляет токены {зуб}, {коронка} и т. д. Неизвестные оставляет как есть, чтобы опечатку было видно. */
export function fill(text: unknown, tokens: Tokens): string {
	return String(text ?? "").replace(TOKEN, (match, key: string) => {
		const value = tokens[key.toLowerCase()];
		return value === undefined ? match : value;
	});
}

const SAFE_HREF = /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export function safeHref(url: unknown): string | undefined {
	const value = String(url ?? "").trim();
	return value && SAFE_HREF.test(value) ? value : undefined;
}

export function isExternal(url: string): boolean {
	return /^https?:\/\//i.test(url);
}

// Типографика. Работает по тексту, теги на время подменяются символами из Private Use Area.
// Предлоги и союзы из 1–2 букв («в», «по», «Во»), но не аббревиатуры вроде «КТ».
const SHORT_WORD = /(?<=^|[\s(«„\u00A0\uE001—])(?!(?:ли|же|бы|ль)\s)([А-ЯЁA-Z][а-яёa-z]?|[а-яёa-z]{1,2}|[Дд]ля|[Бб]ез|[Пп]ри|[Пп]од|[Нн]ад|[Пп]ро)\s+(?=\S)/gu;
const PARTICLE = /\s+(ли|же|бы|ль)(?=[\s.,!?;:)»\uE000]|$)/gu;
const DASH = /\s+—/g;
const DIGIT_GROUP = /(\d)[ \u00A0](?=\d{3}(?!\d))/g;
const DIGIT_WORD = /(\d)\s+(?=\p{L}{2,}|[₽%°])/gu;
const ABBR = /(?<=^|\s)(ул|пр|г|д|им|стр)\.\s+/gu;
const NOWRAP = /(All-on-\d+|\d+–\d+\u00A0[\p{L}]+)/gu;

function typographText(text: string): string {
	return text
		.replace(DIGIT_GROUP, `$1${NNBSP}`)
		.replace(DIGIT_WORD, `$1${NBSP}`)
		.replace(DASH, `${NBSP}—`)
		.replace(ABBR, `$1.${NBSP}`)
		.replace(SHORT_WORD, `$1${NBSP}`)
		.replace(PARTICLE, `${NBSP}$1`);
}

/** Расставляет неразрывные пробелы в готовом HTML, не трогая теги. */
export function typograph(html: string): string {
	const tags: string[] = [];
	const masked = html.replace(/<[^>]+>/g, (tag) => {
		tags.push(tag);
		return `\uE000${tags.length - 1}\uE001`;
	});
	const typed = typographText(masked).replace(/\uE000(\d+)\uE001/g, (_, i: string) => tags[Number(i)]);
	// Не переносить All-on-4 по дефису и «3–4 месяца» по тире
	return typed
		.split(/(<[^>]+>)/)
		.map((part) => (part.startsWith("<") ? part : part.replace(NOWRAP, '<span class="nowrap">$1</span>')))
		.join("");
}

function markup(escaped: string): string {
	return escaped
		.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
			const href = safeHref(url.replace(/&amp;/g, "&"));
			if (!href) return label;
			const external = isExternal(href) ? ' target="_blank" rel="noopener"' : "";
			return `<a href="${esc(href)}"${external}>${label}</a>`;
		})
		.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
		.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

/** Строка из админки → безопасный HTML (для set:html). */
export function rich(text: unknown, tokens: Tokens): string {
	const filled = fill(text, tokens).trim();
	return filled ? typograph(markup(esc(filled))) : "";
}

/** Без разметки — для атрибутов, title и сообщений в мессенджер. */
export function plain(text: unknown, tokens: Tokens): string {
	return fill(text, tokens)
		.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, "$1")
		.replace(/\*\*([^*\n]+)\*\*/g, "$1")
		.replace(/\*([^*\n]+)\*/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

/** Строки многострочного поля (часы работы, условия гарантии). */
export function lines(text: unknown): string[] {
	return String(text ?? "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

/** Абзацы: разделяются пустой строкой. */
export function paragraphs(text: unknown): string[] {
	return String(text ?? "")
		.split(/\r?\n\s*\r?\n/)
		.map((part) => part.trim())
		.filter(Boolean);
}

/** «своя цифровая лаборатория» → две строки примерно поровну (для подписи на чертеже). */
export function splitNote(text: string): [string, string] {
	const explicit = lines(text);
	if (explicit.length > 1) return [explicit[0], explicit.slice(1).join(" ")];
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length < 2) return [words[0] ?? "", ""];
	let best = 1;
	let bestScore = Infinity;
	for (let i = 1; i < words.length; i++) {
		const score = Math.max(words.slice(0, i).join(" ").length, words.slice(i).join(" ").length);
		if (score < bestScore) {
			bestScore = score;
			best = i;
		}
	}
	return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** JSON для <script type="application/json"> — без «</script>» внутри. */
export function jsonForScript(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
