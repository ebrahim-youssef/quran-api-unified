---
'quran-api-unified': minor
---

Add translation support (#9) to the `alquran_cloud` adapter via alquran.cloud's keyless
translation editions.

`get({ include: ['translation'], edition })` returns a `UnifiedTranslation` for the chosen
edition (default `en.sahih`), carrying the edition id and language alongside the translated
text.
