# quran-api-unified

## 0.2.0

### Minor Changes

- d56a76d: Add ayah recitation audio (#8) to the `alquran_cloud` and `quran_api_edge` adapters.

  `get({ include: ['audio'], reciter })` now returns a `UnifiedAudio` with a working mp3 URL:
  Al-Quran Cloud serves it per audio edition (default `ar.alafasy`); Quran API Edge returns it
  in the same one-file response, picking the requested reciter id or the first available. Both
  are ayah scope. Surah-scope audio and an mp3quran provider are deferred until a documented
  surah-audio source lands.

- f55cfa1: Add credentialed providers and the Quran Foundation OAuth2 adapter (#12).

  The client now performs the OAuth2 **client-credentials** grant for adapters whose `auth` is
  `'oauth2-client'`: it exchanges the caller's `clientId`/`secret` at the adapter's `tokenUrl`
  for an access token, caches it per client (respecting `expires_in`), and injects it as
  `ctx.accessToken` for the adapter's `headers` to attach. A caller may instead supply a ready
  `accessToken`. The new `quran_foundation` adapter (official Quran.com v4) uses this; without
  credentials it is skipped in auto-selection and throws only if named explicitly.

  Also extends the HTTP leaf with `method`/`body` (for the token request) and exports the
  `OAuth2ClientConfig` port type.

- 88d343a: Add the client factory, provider selection, and composition — the working `get()` API
  (tickets #4, #5, #6).

  `createQuranClient(options)` returns `{ get, listAdapters, registerAdapter }`. `get()` fans
  the requested concerns out in parallel, each with its own ordered preference and
  fallback-on-error chain (ADR-0004), and returns partial results as data (ADR-0003): a failed
  concern carries its aggregate error plus a per-provider attempt trail without failing the
  others. Provider/network failures never throw; only misuse does — an empty `include`, or an
  explicitly named source that is unknown, non-serving, or missing credentials. Credentialed
  adapters are skipped in auto-selection until their credentials are supplied. The `Adapter`
  port and `builtinAdapters` registry are exported so consumers can register custom providers,
  including into the fallback chain.

- 3ec7ef6: Add opt-in raw provider response passthrough (ADR-0010).

  Pass `includeRaw: true` to `get()` and each successful concern `Part` carries `raw` — the
  provider's original, un-normalized response body — alongside the unified `value`. Off by
  default, so results stay lean. Useful for debugging and for showing raw-vs-unified side by
  side. Additive and backward-compatible: adapters are unchanged and the pure composition layer
  stays I/O-free.

- 5996743: Add tafsir support (#10) via the keyless `spa5k_tafsir` adapter (spa5k tafsir_api over jsDelivr).

  `get({ include: ['tafsir'], tafsirId })` returns a `UnifiedTafsir` for the chosen edition
  (default `ar-tafsir-ibn-kathir`), with the edition id and a derived language tag. Coverage
  varies by edition, so a missing ayah surfaces as an unfulfilled part, not a whole-call failure.
  This completes the four core concerns — text, audio, translation, and tafsir — all keyless.

- 197d99a: Add the first built-in text providers (#7): `alquran_cloud`, `quran_api_edge`, `quran_hub`,
  and `quran_finder`.

  Each maps its real recorded response to `UnifiedVerse`, with `buildUrl` recipes and pure
  transforms; `quran_hub` and `quran_finder` set `useProxy` (CORS), and `quran_finder` reads
  raw text (`responseType: 'text'`) and strips a leading BOM. They are registered in
  `builtinAdapters` in preference order, so `get({ include: ['text'] })` now works out of the
  box with automatic fallback across providers.

  Also adds `createQuranClient({ useBuiltins: false })` to start from only the adapters you
  pass — for a curated provider set or isolated tests.

- ada5dd8: Add translation support (#9) to the `alquran_cloud` adapter via alquran.cloud's keyless
  translation editions.

  `get({ include: ['translation'], edition })` returns a `UnifiedTranslation` for the chosen
  edition (default `en.sahih`), carrying the edition id and language alongside the translated
  text.

- 7a3ce3a: Add the unified schema, typed-result, and typed-error contract (ticket #3).

  Public types now exported: `Ref`, `UnifiedMeta`, and the `Unified{Verse,Audio,Translation,Tafsir}`
  shapes plus their query types; the `Result`, `Attempt`, `Part`, `Composed`, and `GetResult`
  result types with the `okPart`/`errPart` helpers; and the `QuranError`/`QuranErrorCode`/`ThrownQuranError`
  error contract with the `createError`/`throwQuranError` helpers. Errors are data for
  provider/network failures and thrown only for misuse (ADR-0003).

- 21fd5f1: Add the optional `quran-api-unified/zod` entry (#11).

  Exports zod schemas mirroring the unified types — `unified{Verse,Audio,Translation,Tafsir}Schema`
  plus `ref`/`meta` — with `parse`/`safeParse` helpers for callers who want runtime-checked,
  parsed results. `zod` stays an optional peer dependency: importing the core never pulls it in.
  A type-sync test keeps the schemas structurally aligned with the TS types, so drift fails the
  build.

## 0.1.0

### Minor Changes

- 7e40c4b: Initial public release: the package skeleton with a dual ESM + CJS + types build, and the
  automated CI plus OIDC trusted-publishing release pipeline (npm + jsDelivr/unpkg CDN, and a
  VitePress docs site). Feature work (unified schema, client, and provider adapters) follows.
