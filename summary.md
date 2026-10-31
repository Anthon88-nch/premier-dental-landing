# Windows smoke — all PASS

- ✅ dev-сервер запустился — http://localhost:4321
- ✅ демо-контент применён (dev-bypass) — HTTP 200
- ✅ главная отдаётся — HTTP 200
- ✅ цена из CMS на месте
- ✅ врачи из CMS на месте
- ✅ нет неподставленных токенов
- ✅ админка отвечает — HTTP 302 http://localhost:4321/_emdash/admin/login?redirect=%2F_emdash%2Fadmin
- ✅ картинка из медиатеки отдаётся — HTTP 200 image/webp
