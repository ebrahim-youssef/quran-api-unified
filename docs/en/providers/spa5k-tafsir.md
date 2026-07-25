# Tafsir API (spa5k) — provider reference

[العربية](/providers/spa5k-tafsir) · **English**

- **Id:** `spa5k_tafsir` · **Adapter file:** `src/adapters/spa5k-tafsir.ts`
- **Homepage:** https://github.com/spa5k/tafsir_api
- **Content:** tafsir · **Auth:** none · **Needs proxy:** no

## What this provider is

An open collection of tafsir books served as static JSON files over a CDN (jsDelivr), with no
keys. We use it as the tafsir provider for v1 because it works with no credentials at all.

## Endpoints used

Base URL: `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main`

- **Editions list:** `GET /tafsir/editions.json` — returns available editions and their ids,
  e.g. `ar-tafsir-ibn-kathir`, `en-tafsir-ibn-kathir`.
- **Ayah tafsir:** `GET /tafsir/{edition}/{surah}_{ayah}.json`

> **Note:** the exact ayah path shape and edition ids must be confirmed against the repository
> when the adapter is implemented (ticket 10) — the repo structure may change. Fetch the live
> `editions.json` first, then pin the fixture.

## Raw response shape

```json
{
  "surah": 1,
  "ayah": 1,
  "text": "the tafsir text for the ayah..."
}
```

## Mapping to the unified schema (and why)

**Tafsir → `UnifiedTafsir`:**

| Unified field | Raw source                                  | Note                        |
| ------------- | ------------------------------------------- | --------------------------- |
| `key`         | `` `${raw.surah}:${raw.ayah}` ``            | `surah:ayah` key            |
| `text`        | `raw.text`                                  | the tafsir text             |
| `edition`     | the requested edition id                    | e.g. `ar-tafsir-ibn-kathir` |
| `language`    | derived from the edition prefix (`ar`/`en`) | tafsir language             |
| `source`      | `"Tafsir API (spa5k)"`                      | constant                    |

The adapter sets a default edition (a well-known Arabic tafsir); the caller can pass `edition`
through the query params.

## Auth

None required; the files are public static assets over a CDN.

## Rate limits & quirks

jsDelivr delivery with no practical limits worth noting. Coverage varies by edition; not every
ayah exists in every edition, so the adapter should handle absence gracefully (an unfulfilled
part, not a whole-call error).

## Keeping this current

Before implementing or changing it, fetch `editions.json` and a real ayah file, pin the exact
path, and refresh the fixture under `test/fixtures/spa5k_tafsir/`. Drift is checked via
`pnpm test:live`.
