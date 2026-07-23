---
'quran-api-unified': minor
---

Add the unified schema, typed-result, and typed-error contract (ticket #3).

Public types now exported: `Ref`, `UnifiedMeta`, and the `Unified{Verse,Audio,Translation,Tafsir}`
shapes plus their query types; the `Result`, `Attempt`, `Part`, `Composed`, and `GetResult`
result types with the `okPart`/`errPart` helpers; and the `QuranError`/`QuranErrorCode`/`ThrownQuranError`
error contract with the `createError`/`throwQuranError` helpers. Errors are data for
provider/network failures and thrown only for misuse (ADR-0003).
