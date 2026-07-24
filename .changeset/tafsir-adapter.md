---
'quran-api-unified': minor
---

Add tafsir support (#10) via the keyless `spa5k_tafsir` adapter (spa5k tafsir_api over jsDelivr).

`get({ include: ['tafsir'], tafsirId })` returns a `UnifiedTafsir` for the chosen edition
(default `ar-tafsir-ibn-kathir`), with the edition id and a derived language tag. Coverage
varies by edition, so a missing ayah surfaces as an unfulfilled part, not a whole-call failure.
This completes the four core concerns — text, audio, translation, and tafsir — all keyless.
