---
'quran-api-unified': minor
---

Add ayah recitation audio (#8) to the `alquran_cloud` and `quran_api_edge` adapters.

`get({ include: ['audio'], reciter })` now returns a `UnifiedAudio` with a working mp3 URL:
Al-Quran Cloud serves it per audio edition (default `ar.alafasy`); Quran API Edge returns it
in the same one-file response, picking the requested reciter id or the first available. Both
are ayah scope. Surah-scope audio and an mp3quran provider are deferred until a documented
surah-audio source lands.
