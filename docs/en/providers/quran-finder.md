# Quran Explorer (Quran Finder) — provider reference

[العربية](/providers/quran-finder) · **English**

- **Id:** `quran_finder` · **Adapter file:** `src/adapters/quran-finder.ts`
- **Homepage:** https://quran-finder.com
- **Content:** text (raw) · **Auth:** none · **Needs proxy:** yes (CORS)

## What this provider is

A source that serves text from static files, combining speed with the safety of a static
model. It returns plain text, not JSON.

## Endpoints used

Base URL: `https://api.quran-finder.com`

- **Text (ayah):** `GET /text/ar/{surah}/{ayah}/` — returns the ayah text as a raw string.

## Raw response shape

```
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
```

The response is a direct text string; so the adapter sets `responseType: 'text'`.

## Mapping to the unified schema (and why)

**Text → `UnifiedVerse`:**

| Unified field | Source                               | Note                                                           |
| ------------- | ------------------------------------ | -------------------------------------------------------------- |
| `key`         | `` `${query.surah}:${query.ayah}` `` | built from the **request**, since the response has no position |
| `id`          | `` `${query.surah}:${query.ayah}` `` | no global id from the source                                   |
| `text`        | the raw string (after `trim`)        | the verse text                                                 |
| `source`      | `"Quran Explorer"`                   | constant                                                       |
| `meta.type`   | `"raw"`                              | signals the origin was raw text                                |

We build `key` and `id` from the request because the response is only text — no ayah number,
juz, or page.

## Auth

None required. Calling it from the browser needs a **proxy** for CORS, so the adapter sets
`useProxy: true`.

## Rate limits & quirks

Returns **raw text**, not JSON — mind the parsing. Its files are static and fast, and it
provides no positional data.

## Keeping this current

Before changing the adapter, re-check the live API and refresh the fixture under
`test/fixtures/quran_finder/`. Drift is checked via `pnpm test:live`.
