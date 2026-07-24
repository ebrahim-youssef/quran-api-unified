---
'quran-api-unified': minor
---

Add the first built-in text providers (#7): `alquran_cloud`, `quran_api_edge`, `quran_hub`,
and `quran_finder`.

Each maps its real recorded response to `UnifiedVerse`, with `buildUrl` recipes and pure
transforms; `quran_hub` and `quran_finder` set `useProxy` (CORS), and `quran_finder` reads
raw text (`responseType: 'text'`) and strips a leading BOM. They are registered in
`builtinAdapters` in preference order, so `get({ include: ['text'] })` now works out of the
box with automatic fallback across providers.

Also adds `createQuranClient({ useBuiltins: false })` to start from only the adapters you
pass — for a curated provider set or isolated tests.
