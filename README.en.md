# quran-api-unified

[العربية](./README.md) · **English**

A JavaScript/TypeScript library that unifies access to the many Quran data sources — text,
audio, translation, and tafsir — behind a single interface and one normalized schema, with
automatic provider selection and fallback when a source is unavailable, so your app is never
locked to a single provider.

> **Pre-release.** The library is implemented and passing its full test suite across all four
> content types; it is not yet published to npm.

## What it is

Building Quran apps means dealing with fragmented sources: one API returns verses in a field
called `verses`, another calls it `ayahs` with a completely different shape, a third only
serves audio, a fourth serves translations. That fragmentation ties your app to one source —
if it goes down (as happens in peak seasons) you end up rewriting parts of your frontend.

This library is a unification layer that sits between your app and those sources: it takes the
raw data from whichever provider is available, transforms it into one fixed shape that you
define, and hands it back. You ask for an ayah or a surah, request whatever you want alongside
it — audio, translation, tafsir — and get it all in a single call, in the same shape no matter
which source served it.

## Features

- **One interface** over many sources; you don't care which one served the request.
- **A unified schema** per content type: text, audio, translation, tafsir.
- **Automatic fallback**: if a source fails, the library moves to the next and records the
  attempt trail for you.
- **One call for everything**: an ayah or surah with its audio, translation, and tafsir in a
  single request, even when each comes from a different source.
- **An extensible adapter system**: every provider has its own adapter, and you can register
  your own.
- **Keyless by default**, with optional credential support for providers that require it.
- **Raw passthrough (opt-in)**: ask for `includeRaw: true` and each result also carries the
  provider's original, un-normalized response next to the unified one — for debugging or a
  raw-vs-unified comparison.
- **Runs everywhere**: Node, browsers, Deno, and Bun; ESM and CJS; full TypeScript types.

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
  console.error(res.error.code) // a typed error, with res.attempts holding the trail
}
```

The result is **typed data, not exceptions**: you check `res.ok`, and each requested content
part carries its own status, so if one fails the rest still succeed.

## Supported providers

| Provider | Id | Content | Needs credentials? |
| --- | --- | --- | --- |
| Quran Foundation | `quran_foundation` | text | Yes (OAuth2) |
| Al-Quran Cloud | `alquran_cloud` | text, audio, translation | No |
| Quran API (Edge) | `quran_api_edge` | text, audio | No |
| Quran Hub | `quran_hub` | text | No (via proxy) |
| Quran Explorer | `quran_finder` | text | No (via proxy) |
| Tafsir API (spa5k) | `spa5k_tafsir` | tafsir | No |

Each provider has a reference page under [`docs/providers/`](./docs/providers) explaining its
upstream API and why the adapter maps it the way it does.

## Credentials

The library works with **no key at all** for the open providers. A provider that requires
credentials (such as Quran Foundation) is configured when you create the client, keyed by the
provider id:

```ts
const quran = createQuranClient({
  credentials: {
    quran_foundation: { clientId: '...', secret: '...' },
  },
})
```

An adapter that needs credentials it wasn't given is skipped in auto-selection, and throws
only if you request it explicitly by name.

## Advanced usage

**Pin a concern to one provider**, with your own fallback order:

```ts
const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text'],
  source: { text: { id: 'quran_hub', fallback: ['quran_finder', 'alquran_cloud'] } },
})
```

**Register a custom adapter** — a declarative recipe, not a class to extend:

```ts
import { createQuranClient, type Adapter } from 'quran-api-unified'

const myProvider: Adapter = {
  id: 'my_provider',
  name: 'My Provider',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `https://example.com/api/ayah/${q.surah}/${q.ayah ?? 1}`,
    transform: (raw, q) => ({
      key: `${q.surah}:${q.ayah ?? 1}`,
      surah: q.surah,
      ayah: q.ayah ?? 1,
      source: 'My Provider',
      text: (raw as { text: string }).text,
    }),
  },
}

const quran = createQuranClient({ adapters: [myProvider] })
```

**Validate with zod** via the optional entry (zod is a peer dependency, not bundled):

```ts
import { parseUnifiedVerse } from 'quran-api-unified/zod'

const verse = parseUnifiedVerse(res.value.text?.value)
```

The full guide — partial results, browser & CORS, and more — is on the
[docs site](#documentation) below.

## Documentation

Full documentation — guides, the API reference, and provider pages — lives on the docs site
(built with VitePress) and in the [`docs/`](./docs) folder. The documentation is Arabic-first
with an English mirror.

## Contributing

Contributions are welcome, and the most useful are new provider adapters. The contributing
guide and the adapter contract are in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

[MIT](./LICENSE).
