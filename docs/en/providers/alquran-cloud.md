# Al-Quran Cloud — provider reference

[العربية](/providers/alquran-cloud) · **English**

- **Id:** `alquran_cloud` · **Adapter file:** `src/adapters/alquran-cloud.ts`
- **Homepage / docs:** https://alquran.cloud/api
- **Content:** text, audio, translation · **Auth:** none · **Needs proxy:** no

## What this provider is

An open, broad-coverage API serving text plus 400+ text and audio editions over a global CDN,
with no keys. Its flexibility and stability make it our primary provider for more than one
content type.

## Endpoints used

Base URL: `https://api.alquran.cloud/v1`

- **Text (ayah):** `GET /ayah/{surah}:{ayah}` — no auth.
- **Audio (ayah):** `GET /ayah/{surah}:{ayah}/{edition}` where `edition` is an audio edition,
  e.g. `ar.alafasy` (the adapter default).
- **Translation (ayah):** `GET /ayah/{surah}:{ayah}/{edition}` where `edition` is a translated
  edition, e.g. `en.sahih`.

The same endpoint serves text, audio, and translation, distinguished by the `edition` id.

## Raw response shape

```json
{
  "code": 200,
  "status": "OK",
  "data": {
    "number": 262,
    "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "numberInSurah": 1,
    "juz": 1,
    "page": 1,
    "surah": { "number": 1, "name": "سُورَةُ ٱلْفَاتِحَةِ" },
    "edition": { "identifier": "quran-uthmani", "language": "ar", "format": "text" },
    "audio": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3",
    "audioSecondary": ["https://.../262.mp3"]
  }
}
```

For an audio edition, `audio` and `audioSecondary` are populated; for a translated edition,
`text` holds the translation and `edition` describes its language.

## Mapping to the unified schema (and why)

**Text → `UnifiedVerse`:**

| Unified field            | Raw source                                         | Note                        |
| ------------------------ | -------------------------------------------------- | --------------------------- |
| `key`                    | `` `${data.surah.number}:${data.numberInSurah}` `` | consistent `surah:ayah` key |
| `id`                     | `data.number`                                      | global ayah number          |
| `text`                   | `data.text`                                        | the verse text              |
| `source`                 | `"Al-Quran Cloud"`                                 | constant                    |
| `meta.juz` / `meta.page` | `data.juz` / `data.page`                           | positional data             |

**Audio → `UnifiedAudio`:** `url` from `data.audio`, `reciter` from the edition id, `scope` =
`ayah`, `audioSecondary` kept in `meta`. **Translation → `UnifiedTranslation`:** `text` from
`data.text`, `language`/`edition` from `data.edition`.

We build `key` from `numberInSurah`, not `number`, because `number` is a global index across
the whole mushaf while the unified key is `surah:ayah`.

## Auth

None required. All endpoints are open.

## Rate limits & quirks

CDN-delivered with generous limits for normal use. Available editions (text, audio,
translation) are listed at `GET /edition`. An audio edition returns a ready mp3 file URL.

## Keeping this current

Before changing the adapter, re-read the live docs and refresh the fixture under
`test/fixtures/alquran_cloud/`. Drift is checked via `pnpm test:live`.
