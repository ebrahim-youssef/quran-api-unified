# Quran Foundation — provider reference

[العربية](/providers/quran-foundation) · **English**

- **Id:** `quran_foundation` · **Adapter file:** `src/adapters/quran-foundation.ts`
- **Homepage / docs:** https://quran.com · https://api-docs.quran.foundation
- **Content:** text · **Auth:** OAuth2 (client credentials) · **Needs proxy:** no

## What this provider is

The official Quran Foundation (Quran.com) API, version 4 (v4). It is known for the official
mushaf layouts and reliable Uthmani text. We use it as a text provider.

## Endpoints used

Base URL: `https://api.quran.com/api/v4`

- **Text (ayah):** `GET /quran/verses/uthmani?verse_key={surah}:{ayah}`

## Raw response shape

```json
{
  "verses": [
    {
      "id": 1,
      "verse_key": "1:1",
      "text_uthmani": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "juz_number": 1,
      "page_number": 1
    }
  ]
}
```

The response is an array named `verses`; the adapter takes its first element.

## Mapping to the unified schema (and why)

**Text → `UnifiedVerse`:**

| Unified field            | Raw source                   | Note                         |
| ------------------------ | ---------------------------- | ---------------------------- |
| `key`                    | `verses[0].verse_key`        | already in `surah:ayah` form |
| `id`                     | `verses[0].id`               | provider's verse id          |
| `text`                   | `verses[0].text_uthmani`     | the Uthmani text             |
| `source`                 | `"Quran Foundation"`         | constant                     |
| `meta.juz` / `meta.page` | `juz_number` / `page_number` | positional data              |

We read the first element of `verses` because the endpoint returns the requested ayah inside
an array.

## Auth

The `api.quran.com/api/v4` endpoints have historically been open, but the official Quran
Foundation gateway now issues **OAuth2 client credentials** (`clientId` and `secret`). Pass
them like this:

```ts
createQuranClient({
  credentials: { quran_foundation: { clientId: '...', secret: '...' } },
})
```

Without credentials the adapter is skipped in auto-selection, and throws only if requested
explicitly by name. The keys are documented in `.env.example` for the live-smoke suite.

## Rate limits & quirks

Check the Foundation's current policy via the developer portal. The `verse_key` format is
`surah:ayah`.

## Keeping this current

Before changing the adapter, re-read the live `api-docs.quran.foundation` docs and refresh the
fixture under `test/fixtures/quran_foundation/`. Drift is checked via `pnpm test:live`.
