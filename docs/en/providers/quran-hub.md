# Quran Hub — provider reference

[العربية](/providers/quran-hub) · **English**

- **Id:** `quran_hub` · **Adapter file:** `src/adapters/quran-hub.ts`
- **Homepage:** https://quranhub.app
- **Content:** text · **Auth:** none · **Needs proxy:** yes (CORS)

## What this provider is

An API that exposes rich morphological data (millions of word-level tags for the Quran). We
use it for text; its shape is compatible with Al-Quran Cloud.

## Endpoints used

Base URL: `https://api.quranhub.com/v1`

- **Text (ayah):** `GET /ayah/{surah}:{ayah}`

## Raw response shape

```json
{
  "data": {
    "number": 1,
    "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "numberInSurah": 1,
    "juz": 1,
    "surah": { "number": 1, "name": "الفاتحة" }
  }
}
```

## Mapping to the unified schema (and why)

**Text → `UnifiedVerse`:**

| Unified field             | Raw source                                         | Note               |
| ------------------------- | -------------------------------------------------- | ------------------ |
| `key`                     | `` `${data.surah.number}:${data.numberInSurah}` `` | `surah:ayah` key   |
| `id`                      | `data.number`                                      | global ayah number |
| `text`                    | `data.text`                                        | the verse text     |
| `source`                  | `"Quran Hub"`                                      | constant           |
| `meta.juz` / `meta.surah` | `data.juz` / `data.surah.name`                     | extras             |

The shape matches Al-Quran Cloud, so the transform is the same.

## Auth

No credentials required. But calling it from the browser needs a **proxy** to get past CORS;
so the adapter sets `useProxy: true`, and the client wraps the URL with the configured proxy
(`options.proxy`, which has a public default). In Node a proxy is usually unnecessary and can
be disabled with `proxy: false`.

## Rate limits & quirks

Rate-limit documentation is not published; be moderate. Its standout feature is morphological
data, which we do not use here.

## Keeping this current

Before changing the adapter, re-check the live API and refresh the fixture under
`test/fixtures/quran_hub/`. Drift is checked via `pnpm test:live`.
