---
layout: home
title: quran-api-unified
titleTemplate: A unified interface over Quran APIs
hero:
  name: quran-api-unified
  text: One interface over many Quran data providers
  tagline: Verse text, audio, translation, and tafsir from multiple providers — with automatic provider selection and fallback, so your app never hard-couples to one provider.
  actions:
    - theme: brand
      text: Get started
      link: /en/
    - theme: alt
      text: العربية
      link: /
features:
  - title: One provider or many, painlessly
    details: Ask only for what you need; the library picks a suitable provider and falls back automatically on failure.
  - title: Unified schema
    details: Every provider's output is normalized into one consistent schema — no juggling different shapes.
  - title: Light and neutral
    details: A dependency-free core that runs in Node, browsers, Deno, and Bun — no framework, no database.
---

## Install

```bash
npm i quran-api-unified
# or
pnpm add quran-api-unified
```

## Quick start

```ts
import { createQuranClient } from 'quran-api-unified'

const quran = createQuranClient()

const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text', 'audio', 'translation', 'tafsir'],
})

if (res.ok) {
  console.log(res.value.text?.value?.text) // بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
  console.log(res.value.audio?.value?.url) // the recitation URL
} else {
  console.error(res.error.code, res.attempts) // a typed error, with the full attempt trail
}
```

`createQuranClient()` needs no arguments — the keyless providers (Al-Quran Cloud, Quran API
Edge, Quran Hub, Quran Explorer, spa5k tafsir) cover all four concerns out of the box.

## Core concepts

- **`ref`** — `{ surah, ayah }`. Omit `ayah` to mean "the whole surah" (surah-scope support
  varies by concern; see each concern below).
- **`include`** — which concerns to fetch: any of `'text'`, `'audio'`, `'translation'`,
  `'tafsir'`. `get()` fetches all of them in parallel, each with its own provider fallback
  chain.
- **The result is data, not exceptions.** `get()` only ever throws for _misuse_ — an empty
  `include`, or an explicitly named source that's unknown, doesn't serve the concern, or is
  missing required credentials. Every provider/network failure comes back as `res.ok: false`
  or as a failed `Part` — see [Handling partial results](#handling-partial-results).

## The four concerns

Each accepts an optional per-request identifier; when omitted, the provider's own default is
used.

```ts
const res = await quran.get({
  ref: { surah: 2, ayah: 255 },
  include: ['text', 'audio', 'translation', 'tafsir'],
  reciter: 'ar.alafasy', // audio: reciter id (provider-specific)
  edition: 'en.sahih', // translation: edition id (provider-specific)
  tafsirId: 'en-tafisr-ibn-kathir', // tafsir: edition id (provider-specific)
})
```

| Concern       | Shape (`res.value.<concern>?.value`)                                |
| ------------- | ------------------------------------------------------------------- |
| `text`        | `{ key, surah, ayah, source, text, meta? }`                         |
| `audio`       | `{ key, surah, ayah?, scope, source, reciter, url, format, meta? }` |
| `translation` | `{ key, surah, ayah, source, edition, language, text, meta? }`      |
| `tafsir`      | `{ key, surah, ayah, source, tafsirId, text, meta? }`               |

`key` is always the canonical `"surah:ayah"` string; `source` is the display name of the
provider that actually served the value (e.g. `"Al-Quran Cloud"`). See each provider's
reference page under [Providers](#providers) for exactly which id it expects for `reciter`,
`edition`, or `tafsirId`.

## Handling partial results

`res.ok` covers the whole call: it's `true` as long as _at least one_ requested concern
succeeded. Each concern is independently inspectable, so one failure never takes down the
others:

```ts
const res = await quran.get({ ref: { surah: 18, ayah: 10 }, include: ['text', 'tafsir'] })

if (res.ok) {
  if (res.value.tafsir?.ok) {
    console.log(res.value.tafsir.value.text)
  } else {
    // this edition may not cover this ayah — every provider tried is in .attempts
    console.warn(res.value.tafsir?.error?.code, res.value.tafsir?.attempts)
  }
}
```

Every `Part` (`res.value.text`, `.audio`, `.translation`, `.tafsir`) carries:

- `ok` / `value` / `error` — the outcome for that concern.
- `source` — the adapter id that served it, when `ok` is `true`.
- `attempts` — every provider tried for this concern, in order, each with its own
  `adapterId`, `ok`, `error?`, and `durationMs?`.

## Choosing a source explicitly

By default each concern auto-selects across the registered adapters, in registration order,
skipping any that need credentials you haven't supplied. To pin a concern to one provider
(with your own fallback order), pass `source`:

```ts
const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text'],
  source: {
    text: { id: 'quran_hub', fallback: ['quran_finder', 'alquran_cloud'] },
  },
})
```

An unknown id, an adapter that doesn't serve the requested concern, or one missing required
credentials is treated as misuse here and **throws** — since you named it explicitly, a
typo or a wrong assumption should surface immediately rather than fail silently.

## Credentials

Keyless providers need nothing. A credentialed provider (currently
[Quran Foundation](/providers/quran-foundation.en), OAuth2 client-credentials) is configured
per adapter id when you create the client:

```ts
const quran = createQuranClient({
  credentials: {
    quran_foundation: { clientId: '...', secret: '...' },
  },
})
```

The client exchanges `clientId`/`secret` for an access token at the adapter's token endpoint,
caches it for its lifetime, and refreshes it automatically. Without credentials, a
credentialed adapter is skipped during auto-selection — your keyless request still succeeds
via the other providers — and only throws if you name it explicitly via `source`.

If you already have a token (e.g. minted elsewhere), you can supply it directly and skip the
exchange:

```ts
const quran = createQuranClient({
  credentials: { quran_foundation: { accessToken: 'eyJ...' } },
})
```

## Raw passthrough

Pass `includeRaw: true` to also get each provider's original, un-normalized response body
alongside the unified value — useful for debugging a mapping or showing a raw-vs-unified
comparison:

```ts
const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text'],
  includeRaw: true,
})

if (res.ok && res.value.text?.ok) {
  console.log(res.value.text.value) // the unified UnifiedVerse
  console.log(res.value.text.raw) // the provider's original response body (unknown)
}
```

`raw` is only present on a successful `Part` when `includeRaw` was set — results stay lean by
default.

## Custom adapters

An adapter is a declarative recipe — a `buildUrl` function plus a pure `transform` — not a
class to extend. Register your own to add a provider or override a built-in one by id:

```ts
import { createQuranClient, type Adapter } from 'quran-api-unified'

const myProvider: Adapter = {
  id: 'my_provider',
  name: 'My Provider',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `https://example.com/api/ayah/${q.surah}/${q.ayah ?? 1}`,
    transform: (raw, q) => {
      const data = raw as { text: string }
      return {
        key: `${q.surah}:${q.ayah ?? 1}`,
        surah: q.surah,
        ayah: q.ayah ?? 1,
        source: 'My Provider',
        text: data.text,
      }
    },
  },
}

const quran = createQuranClient({ adapters: [myProvider] })
// or, to use *only* your own adapters, without the built-ins:
// createQuranClient({ adapters: [myProvider], useBuiltins: false })
```

Once registered, `myProvider` participates in auto-selection alongside the built-ins (in
registration order) and can be named in `source.<concern>.id`/`.fallback` like any other
adapter.

## Validating with zod

An optional `quran-api-unified/zod` entry exports zod schemas for the unified shapes — zod is
a peer dependency, not bundled into the core:

```ts
import { parseUnifiedVerse, unifiedVerseSchema } from 'quran-api-unified/zod'

const verse = parseUnifiedVerse(res.value.text?.value) // throws on shape mismatch
const result = unifiedVerseSchema.safeParse(res.value.text?.value) // { success, data | error }
```

Matching `parse`/`safeParse` pairs exist for audio, translation, and tafsir
(`parseUnifiedAudio`, `parseUnifiedTranslation`, `parseUnifiedTafsir`, and their
`safeParse…` counterparts).

## Browser usage & CORS

Some providers (Quran Hub, Quran Explorer) don't send CORS headers, so their adapters set
`useProxy: true` and need a proxy configured to work from a browser:

```ts
const quran = createQuranClient({
  proxy: 'https://your-cors-proxy.example.com/?url=',
  // or a function: proxy: (url) => `https://your-proxy.example.com/${url}`
})
```

Leave `proxy` unset outside the browser (Node, Deno, Bun) — those providers work directly
without one.

## Environments

Ships as dual ESM + CJS with full TypeScript types, for Node, browsers, Deno, and Bun:

```js
// ESM
import { createQuranClient } from 'quran-api-unified'
// CJS
const { createQuranClient } = require('quran-api-unified')
```

In an environment with no global `fetch`, pass one explicitly via `createQuranClient({ fetch })`.

## Providers

Each built-in provider has a reference page with its upstream API and why the adapter maps it
the way it does:

- [Quran Foundation](/providers/quran-foundation.en) — text, OAuth2
- [Al-Quran Cloud](/providers/alquran-cloud.en) — text, audio, translation
- [Quran API (Edge)](/providers/quran-api-edge.en) — text, audio
- [Quran Hub](/providers/quran-hub.en) — text, via proxy
- [Quran Explorer](/providers/quran-finder.en) — text, via proxy
- [Tafsir API (spa5k)](/providers/spa5k-tafsir.en) — tafsir

See the [CHANGELOG](https://github.com/Ibrahim-Rezq/quran-api-unified/blob/main/CHANGELOG.md)
for release history and [CONTRIBUTING](https://github.com/Ibrahim-Rezq/quran-api-unified/blob/main/CONTRIBUTING.md)
for the adapter contract if you'd like to contribute a new provider.
