---
'quran-api-unified': minor
---

Add the optional `quran-api-unified/zod` entry (#11).

Exports zod schemas mirroring the unified types — `unified{Verse,Audio,Translation,Tafsir}Schema`
plus `ref`/`meta` — with `parse`/`safeParse` helpers for callers who want runtime-checked,
parsed results. `zod` stays an optional peer dependency: importing the core never pulls it in.
A type-sync test keeps the schemas structurally aligned with the TS types, so drift fails the
build.
