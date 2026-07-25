# Quran API (Edge) — provider reference

[العربية](/providers/quran-api-edge) · **English**

- **Id:** `quran_api_edge` · **Adapter file:** `src/adapters/quran-api-edge.ts`
- **Homepage:** https://quranapi.pages.dev
- **Content:** text, audio · **Auth:** none · **Needs proxy:** no

## What this provider is

A fast, static API served from the network edge that returns both the text and the audio of a
single ayah in one JSON file. A good fit when latency matters.

## Endpoints used

Base URL: `https://quranapi.pages.dev/api`

- **Text and audio (ayah):** `GET /{surah}/{ayah}.json` — one file carries both.

## Raw response shape

```json
{
  "surahNo": 1,
  "ayahNo": 1,
  "arabic1": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "english": "In the name of Allah...",
  "surahNameArabic": "الفاتحة",
  "audio": {
    "1": {
      "reciter": "Mishary Rashid Al-Afasy",
      "url": "https://the-quran-project.github.io/Quran-Audio/Data/1/1.mp3",
      "originalUrl": "https://..."
    }
  }
}
```

`audio` is an object keyed by a numeric reciter id.

## Mapping to the unified schema (and why)

**Text → `UnifiedVerse`:**

| Unified field                 | Raw source                    | Note                         |
| ----------------------------- | ----------------------------- | ---------------------------- |
| `key`                         | `` `${surahNo}:${ayahNo}` ``  | `surah:ayah` key             |
| `id`                          | `ayahNo`                      | ayah number within the surah |
| `text`                        | `arabic1`                     | the Arabic text              |
| `source`                      | `"Quran API (Edge)"`          | constant                     |
| `meta.surah` / `meta.english` | `surahNameArabic` / `english` | extras                       |

**Audio → `UnifiedAudio`:** the adapter picks a reciter (the requested id, else the first key
in `audio`), takes `url` and `reciter` from it, sets `scope` = `ayah`, and keeps `reciterId`
and `originalUrl` in `meta`.

We use `arabic1` as the primary text; `arabic2` (when present) is an alternate form left in
`meta` if needed.

## Auth

None required.

## Rate limits & quirks

Edge delivery is fast. The response combines text and audio, so two content types for an ayah
can be served in one call. Reciter keys are numeric; if no reciter is specified we take the
first.

## Keeping this current

Before changing the adapter, re-check the live API and refresh the fixture under
`test/fixtures/quran_api_edge/`. Drift is checked via `pnpm test:live`.
