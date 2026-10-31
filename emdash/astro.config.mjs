import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Локальный запуск: база SQLite в data.db, загруженные файлы — в uploads/.
export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			admin: {
				siteName: "Премьер — лендинг",
				// Админка только на русском (английский EmDash оставляет запасным)
				locales: ["ru"],
				// Лендингу не нужны: календарь публикаций, комментарии, редиректы, виджеты, разделы, подписи, импорт
				hiddenNavItems: ["calendar", "comments", "redirects", "widgets", "sections", "bylines", "import"],
			},
		}),
	],
	devToolbar: { enabled: false },
});
