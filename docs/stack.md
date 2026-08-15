# Stack & Tooling — quran-api-unified

The stack and canonical patterns for this library: **framework-agnostic npm package** in
TypeScript strict, shipped as **dual ESM + CJS + `.d.ts`** (usable from both JS and TS), built
with **tsup**, tested with **Vitest** (+ Playwright for the browser-bundle smoke), documented
with **VitePress**, released with **Changesets**, package-manager **pnpm**. Optional add-ons:
**zod** (optional validation entry point), **TypeDoc** (API reference). Section numbers are
referenced from `docs/architecture.md`.

A library is **not** an app: no UI, no framework, no database, no staging/production URLs.
The deploy target is **the npm registry**; the "runtime" is *the consumer's* runtime, so
the library must be side-effect-free, dependency-light, and correct across Node, browsers,
Deno, and Bun.

---

## 1. Bootstrap sequence (target repo, in order)

```bash
pnpm init                              # then set "type": "module", name, the exports map (§4)
pnpm add -D typescript tsup vitest @vitest/coverage-v8
pnpm add -D publint @arethetypeswrong/cli            # package-correctness gate (§4/§9)
pnpm add -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-import                     # import-boundary enforcement (§2)
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm dlx husky init                    # pre-commit → lint-staged · commit-msg → commitlint
pnpm add -D @changesets/cli && pnpm changeset init   # versioning + publish (§9)
pnpm add -D @playwright/test && pnpm dlx playwright install chromium  # browser-bundle smoke
pnpm add -D vitepress typedoc typedoc-plugin-markdown # docs site + API reference (§5)
# optional zod entry point — zod is an OPTIONAL peer dependency, never a hard dep:
#   pnpm add -D zod    (dev only; declare it under peerDependencies + peerDependenciesMeta.optional)
```

After bootstrap, all of these must exit 0 before any feature work:
`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm pkg:check && pnpm docs:build`

**package.json scripts to define:**
`build` (`tsup`), `dev` (`tsup --watch`), `typecheck` (`tsc --noEmit`),
`test` (`vitest run`), `test:watch` (`vitest`),
`test:live` (`vitest run -c vitest.live.config.ts` — hits real providers, opt-in),
`smoke:bundle` (build then import ESM+CJS+types and run the browser bundle via Playwright),
`lint`, `format`, `pkg:check` (`publint && attw --pack`),
`docs:dev` / `docs:build` (VitePress), `api:docs` (`typedoc`),
`changeset` (`changeset`), `release` (`changeset publish`), `prepublishOnly` (`pnpm build`).

**Core has ZERO runtime dependencies.** Anything in `dependencies` ships to every consumer;
keep it empty. `zod` (if used) lives in `peerDependencies` + `peerDependenciesMeta` as
optional, imported only from the `./zod` entry.

## 2. Folder structure (ports-and-adapters — the library's whole value)

```
/src
  index.ts            — public API surface (named exports only; NO default exports)
  client.ts           — createQuranClient(options) factory = the composition root
  /core
    compose.ts        — single-call fan-out per concern + merge → one unified result (PURE)
    select.ts         — per-concern ordered preference + fallback chain (PURE; strategy pluggable)
    schema.ts         — Unified{Verse,Audio,Translation,Exegesis} + merged result types
    identity.ts       — provenance + bilingual resource identity primitives
    result.ts         — typed Result/Outcome unions + schema-versioned provenance + attempt trails
    errors.ts         — typed error values (config / adapter-not-found / provider / all-failed)
    http.ts           — the ONLY I/O: fetch wrapper (timeout, proxy, json/text, injectable fetch)
    constants.ts      — base URLs, default timeout, proxy URL, retry counts (no magic values)
  /ports
    adapter.ts        — the Adapter port: capabilities + per-concern { buildUrl, transform, ... }
  /adapters
    index.ts          — builtinAdapters registry
    quran-foundation.ts alquran-cloud.ts quran-api-edge.ts quran-hub.ts quran-finder.ts …
                      — one file per provider (kebab-case name; snake_case `id` inside)
  /registries         — planned read-only Quran structure / word-alignment data (v0.3 backlog item 5)
  /validation
    index.ts          — OPTIONAL zod entry, published as 'quran-api-unified/zod'
    schema.ts
/test
  /fixtures/<id>/…    — recorded REAL provider responses (the offline source of truth)
  /helpers           — fakeFetch, fixture router, url asserters
/docs                — VitePress site
  /providers/<id>.md — ONE reference doc per provider (see templates/provider-doc.md.tmpl)
  /adr               — architecture decision records
/examples            — node-esm.mjs, node-cjs.cjs, typescript.ts, browser/ (dual-consumption proof)
```

**Import-boundary table** (enforce with ESLint `no-restricted-imports` /
`eslint-plugin-import`; commit one deliberate bad import to verify the rule fires):

| Module | May import | Hard no |
| --- | --- | --- |
| `core/schema.ts`, `core/result.ts`, `core/errors.ts`, `core/identity.ts` | types only, each other; `core/result.ts` may read `SCHEMA_VERSION` | anything that does I/O |
| `core/constants.ts` | nothing | everything |
| `core/http.ts` | `core/{errors,constants}`, `ports` | `adapters/*`, `core/{compose,select}` (it is the I/O leaf) |
| `core/compose.ts`, `core/select.ts` | `core/{schema,result,errors,identity}`, `ports`, planned `registries/*` | **`core/http.ts`** (NO I/O in pure logic), concrete `adapters/*` |
| `ports/adapter.ts` | `core/schema` (types) | everything else |
| `adapters/*` | `ports`, `core/{schema,constants}` | **`core/http.ts`** (adapters *describe* calls, they never fetch), `client.ts` |
| `registries/*` *(planned; not shipped yet)* | read-only static data and `core` types | **`core/http.ts`**, adapters, client, or any I/O |
| `client.ts` (composition root) | `core/*`, `ports`, `adapters/index`, planned `registries/*` | — (the sole place that wires `http` + adapters) |
| `validation/*` | `core/schema` (types), `zod` | `core/http`, `adapters/*` |
| `index.ts` | `client`, `adapters/index`, `core` types/errors | — |

**The one boundary that matters:** pure logic (`adapters/*`, `core/{compose,select,schema,
result}`) must never import `core/http.ts`. Adapters are *declarative* — a `buildUrl` string
recipe + a pure `transform`. The client's fetch layer is the only code that touches the
network. This is the library equivalent of the app rule `logic.ts ↛ db.ts`.

`registries/*` is the designed boundary for the deferred v0.3 static-data layer; the directory
does not exist in the shipped source yet.

## 3. Canonical code patterns

**The Adapter port** (`ports/adapter.ts`) — every provider implements this; capabilities
declare which concerns it serves:

```ts
export type Capability = 'text' | 'audio' | 'translation' | 'exegesis'
export type ResponseType = 'json' | 'text'
export type AuthKind = 'none' | 'apiKey' | 'oauth2-client'

export interface AdapterContext {
  readonly credentials?: Readonly<Record<string, string>>
  readonly proxy?: (url: string) => string
  readonly accessToken?: string             // injected for oauth2-client adapters
}

export interface OAuth2ClientConfig {
  readonly tokenUrl: string
  readonly scope?: string
}

export interface CapabilityHandler<Q, R> {
  readonly buildUrl: (q: Q, ctx: AdapterContext) => string
  readonly transform: (raw: unknown, q: Q, ctx: AdapterContext) => R // PURE — no I/O, no Date.now()
  readonly responseType?: ResponseType       // default 'json'
  readonly useProxy?: boolean                // route through ctx.proxy when present
  readonly headers?: (ctx: AdapterContext) => Record<string, string>
  readonly sourceVersion?: (raw: unknown, q: Q, ctx: AdapterContext) => string | undefined
  readonly providerResourceId?: (raw: unknown, q: Q, ctx: AdapterContext) => string | undefined
}

export interface Adapter {
  readonly id: string                        // snake_case, unique, e.g. 'alquran_cloud'
  readonly name: string
  readonly homepage?: string
  readonly capabilities: readonly Capability[]
  readonly auth?: AuthKind                   // default 'none'
  readonly oauth2?: OAuth2ClientConfig
  readonly text?: CapabilityHandler<VerseQuery, UnifiedVerse>
  readonly audio?: CapabilityHandler<AudioQuery, UnifiedAudio>
  readonly translation?: CapabilityHandler<TranslationQuery, UnifiedTranslation>
  readonly exegesis?: CapabilityHandler<ExegesisQuery, UnifiedExegesis>
}
```

**An adapter** (`adapters/alquran-cloud.ts`) — declarative, pure, no fetching:

```ts
import type { Adapter } from '../ports/adapter.js'
import type { StructuralPosition } from '../core/schema.js'
import { verseKey } from './shared.js'

const ALQURAN_CLOUD_BASE = 'https://api.alquran.cloud/v1' // adapter-private, not core/constants.js
const DEFAULT_RECITER = 'ar.alafasy'
const DEFAULT_TRANSLATION = 'en.sahih'

interface AqcAyahResponse {
  readonly data: {
    readonly number: number
    readonly text: string
    readonly numberInSurah: number
    readonly juz?: number
    readonly page?: number
    readonly surah: { readonly number: number; readonly name?: string }
  }
}
interface AqcAudioResponse {
  readonly data: {
    readonly numberInSurah: number
    readonly surah: { readonly number: number }
    readonly audio: string
    readonly audioSecondary?: readonly string[]
    readonly edition?: { readonly identifier?: string }
  }
}
interface AqcTranslationResponse {
  readonly data: {
    readonly text: string
    readonly numberInSurah: number
    readonly surah: { readonly number: number }
    readonly edition?: { readonly identifier?: string; readonly language?: string }
  }
}

function placeholderStructure(): StructuralPosition {
  return { part: 1, group: 1, quarter: 1 }
}

export const alquranCloud: Adapter = {
  id: 'alquran_cloud',
  name: 'Al-Quran Cloud',
  homepage: 'https://alquran.cloud',
  capabilities: ['text', 'audio', 'translation'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${ALQURAN_CLOUD_BASE}/ayah/${verseKey(q.chapter, q.verse)}`,
    transform: (raw) => {
      const { data } = raw as AqcAyahResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number, verse: data.numberInSurah,
        text: data.text.trim(), structure: placeholderStructure(),
        ...(data.page != null ? { meta: { page: data.page } } : {}),
      }
    },
  },
  audio: {
    buildUrl: (q) => `${ALQURAN_CLOUD_BASE}/ayah/${verseKey(q.chapter, q.verse)}/${q.reciter ?? DEFAULT_RECITER}`,
    transform: (raw, q) => {
      const { data } = raw as AqcAudioResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number, verse: data.numberInSurah, scope: 'verse',
        reciter: data.edition?.identifier ?? q.reciter ?? DEFAULT_RECITER,
        url: data.audio, format: 'mp3',
      }
    },
  },
  translation: {
    buildUrl: (q) => `${ALQURAN_CLOUD_BASE}/ayah/${verseKey(q.chapter, q.verse)}/${q.edition ?? DEFAULT_TRANSLATION}`,
    transform: (raw, q) => {
      const { data } = raw as AqcTranslationResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number, verse: data.numberInSurah,
        edition: data.edition?.identifier ?? q.edition ?? DEFAULT_TRANSLATION,
        language: data.edition?.language ?? 'en', text: data.text.trim(),
      }
    },
  },
}
```

**The I/O leaf** (`core/http.ts`) — the only place that fetches:

```ts
export interface HttpDeps {
  readonly fetchImpl: FetchLike
  readonly timeoutMs: number
}

export interface HttpRequest {
  readonly responseType?: ResponseType
  readonly headers?: Record<string, string>
  readonly method?: string
  readonly body?: string
}

export async function httpFetch(
  url: string,
  deps: HttpDeps,
  opts: HttpRequest = {},
): Promise<Result<unknown, QuranError>> {
  const { fetchImpl, timeoutMs } = deps
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, requestInit(opts, controller.signal))
    if (!res.ok) return { ok: false, error: createError('provider_http', `HTTP ${res.status} from ${url}`) }
    try {
      const value = opts.responseType === 'text' ? await res.text() : await res.json()
      return { ok: true, value }
    } catch (cause) {
      return parseErrorResult(url, opts.responseType, cause)
    }
  } catch (cause) {
    return networkErrorResult(url, timeoutMs, controller.signal.aborted, cause)
  } finally {
    clearTimeout(timer)
  }
}
```

**The client factory** (`client.ts`) — functions only, no classes; deps injected:

```ts
export interface ClientOptions {
  readonly fetch?: FetchLike
  readonly timeoutMs?: number
  readonly proxy?: ProxyOption
  readonly adapters?: readonly Adapter[]
  readonly useBuiltins?: boolean
  readonly credentials?: Readonly<Record<string, Readonly<Record<string, string>>>>
}

export interface GetRequest {
  readonly ref: Ref
  readonly include: readonly Capability[]
  readonly reciter?: string
  readonly textEdition?: string
  readonly edition?: string
  readonly exegesisId?: string
  readonly source?: Partial<Record<Capability, SourceSelection>>
  readonly includeRaw?: boolean
}

export interface QuranClient {
  get(req: GetRequest): Promise<GetResult>
  listAdapters(capability?: Capability): readonly Adapter[]
  registerAdapter(adapter: Adapter): QuranClient
}

export function createQuranClient(options: ClientOptions = {}): QuranClient {
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throwQuranError(createError('configuration', 'No fetch implementation available; pass options.fetch'))
  }
  const deps: HttpDeps = { fetchImpl, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS }
  const proxy = resolveProxy(options.proxy)

  const base = options.useBuiltins === false ? [] : builtinAdapters
  const registry = new Map<string, Adapter>(base.map((a) => [a.id, a]))
  for (const adapter of options.adapters ?? []) registry.set(adapter.id, adapter)

  function registerAdapter(adapter: Adapter): QuranClient { registry.set(adapter.id, adapter); return api }
  function listAdapters(capability?: Capability): readonly Adapter[] { /* current registry snapshot */ }

  async function get(req: GetRequest): Promise<GetResult> {
    // select() an ordered fallback chain for each concern; httpFetch → adapter.transform;
    // concerns fan out in parallel. Successful concern Outcomes carry provenance and the
    // envelope carries SCHEMA_VERSION; one failed concern remains a partial success.
  }

  const api = { get, listAdapters, registerAdapter }
  return api
}

let defaultClient: QuranClient | null = null
export const get: QuranClient['get'] = (req) => (defaultClient ??= createQuranClient()).get(req)
```

**Typed results** (`core/result.ts`) — errors are data, never thrown (except misuse):

```ts
export type Result<T, E = QuranError> = { ok: true; value: T } | { ok: false; error: E }

export interface Outcome<T> {        // one concern's outcome inside a composed result
  readonly ok: boolean
  readonly schemaVersion: string
  readonly value?: T
  readonly error?: QuranError
  readonly provenance?: Provenance
  readonly raw?: unknown
  readonly attempts: readonly Attempt[]
}
export interface Composed {
  readonly ref: Ref
  readonly text?: Outcome<UnifiedVerse>
  readonly audio?: Outcome<UnifiedAudio>
  readonly translation?: Outcome<UnifiedTranslation>
  readonly exegesis?: Outcome<UnifiedExegesis>
}
export type GetResult =
  | { readonly ok: true; readonly schemaVersion: string; readonly value: Composed; readonly attempts: readonly Attempt[] }
  | { readonly ok: false; readonly schemaVersion: string; readonly error: QuranError; readonly attempts: readonly Attempt[] }

export function okOutcome<T>(value: T, attempts: readonly Attempt[], provenance?: Provenance, raw?: unknown): Outcome<T> {
  return { ok: true, schemaVersion: SCHEMA_VERSION, value, attempts,
    ...(provenance ? { provenance } : {}), ...(raw === undefined ? {} : { raw }) }
}
export function errOutcome<T>(error: QuranError, attempts: readonly Attempt[]): Outcome<T> {
  return { ok: false, schemaVersion: SCHEMA_VERSION, error, attempts }
}
```

**Identity and provenance** (`core/identity.ts`) — provider facts stay on the `Outcome`, not
on the normalized value:

```ts
export interface LocalizedName {
  readonly ar: string
  readonly en: string
}
export interface ResourceRef {
  readonly id: string
  readonly name: LocalizedName
}
export interface Provenance {
  readonly provider: { readonly id: string; readonly name: string }
  readonly providerResourceId?: string
  readonly sourceUrl?: string
  readonly sourceVersion?: string
  readonly retrievedAt: string
}
```

**TypeScript** — strict; no `any` on the public surface; no `as` except narrowing from
`unknown`; provider `raw` responses are the one place `any` is tolerated *inside* a
`transform` (external, unтипed data), never leaked outward. Named exports only.

## 4. Public API & packaging (dual ESM + CJS + types)

`package.json` essentials:

```jsonc
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".":        { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./zod":    { "types": "./dist/zod.d.ts",   "import": "./dist/zod.js",   "require": "./dist/zod.cjs" },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "peerDependencies": { "zod": ">=3" },
  "peerDependenciesMeta": { "zod": { "optional": true } }
}
```

`tsup.config.ts`: two entries (`src/index.ts`, `src/validation/index.ts` → `zod`),
`format: ['esm','cjs']`, `dts: true`, `treeshake: true`, `sourcemap: true`, `clean: true`,
`.cjs` extension for CJS. No Node built-ins anywhere in `src` (keeps the browser build clean).

**Package-correctness gate** (`pkg:check`): `publint` (exports map sanity) +
`@arethetypeswrong/cli` (`attw --pack` — verifies types resolve under every module
resolution mode, the classic dual-format trap). Both run in CI and block release.

## 5. Documentation system (docs are a first-class deliverable)

For this project docs are gated like code — a feature is not done until its docs exist.

**Documentation language** follows the profile's `documentation.language_policy`. For
`arabic-primary-bilingual` (this project): **Arabic is the primary language, English is a
mirror.** The **code stays English** (identifiers, error codes, error messages) —
`runtime_i18n: english-only`; only the docs *around* the code are Arabic-first, so Arabic
developers can read, use, and contribute in Arabic.
- **Arabic is authored natively** in correct, natural فصحى — never a literal EN→AR
  translation. Author the Arabic file first, then render the English mirror from it.
- File pairing: the primary file is Arabic (`README.md`, `CONTRIBUTING.md`,
  `docs/providers/<id>.md`), each with an English mirror linked from a header line at the top
  of both. For `README`/`CONTRIBUTING` (plain GitHub-rendered files, no routing involved) the
  mirror is a `.en.md` suffix alongside the original. `docs/providers/<id>.md`'s mirror lives
  at `docs/en/providers/<id>.md` instead — a real subpath, not a suffix — because the
  VitePress site assigns a page's locale (and `dir: rtl`/`ltr`) by URL path prefix (`/en/...`),
  so a same-directory `<id>.en.md` file would silently render under the Arabic/RTL locale.
  `README.md` in Arabic is what npm and GitHub show by default — intended.
- Arabic docs are RTL; keep code blocks, identifiers, URLs, and CLI commands LTR (they are
  English). A short "English 🇬🇧 | العربية" switcher line sits at the top of each doc.

- **VitePress site** in `/docs` (deploys to Pages on `main`), configured for **i18n**:
  `ar` is the **default locale** with `dir: rtl`, `en` is the secondary locale. Nav (authored
  per locale): Guide (getting started, composition, provider selection, credentials, error
  handling), Providers (one page each), API reference, Contributing.
- **Per-provider reference** `docs/providers/<id>.md` — ONE file per provider, authored from
  `templates/provider-doc.md.tmpl`. Documents the upstream API in detail (base URL,
  endpoints, params, auth, rate limits, native response shape, quirks) **and why the adapter
  maps it the way it does**. The adapter source file links to its doc; a contributor reading
  the adapter has the upstream reference beside it.
- **API reference** — TSDoc on **every** public export; TypeDoc (`typedoc-plugin-markdown`)
  renders it into the VitePress API section. No public symbol ships without a docblock.
- **README** — thorough: what/why, install, a quick-start that is **executable and tested**
  in CI (documentation examples must not silently rot), and links into the site.
- **CONTRIBUTING.md** — the adapter contract + "add a new provider" walkthrough (see §6).

## 6. Provider adapters & credentials

**Adapter contract** — an adapter is pure and declarative:
1. a unique snake_case `id` and a display `name`;
2. `capabilities` listing the concerns it serves;
3. per concern: a `buildUrl(query, ctx)` (string recipe) + a **pure** `transform(raw, query,
   ctx)` mapping the native response to the unified schema, `responseType` (`json` default,
   `text` for raw-text providers), and `useProxy` if the endpoint needs a CORS proxy;
4. an `auth` marker (`none` | `apiKey` | `oauth2-client`).

**Add a new provider** (checklist — also the CONTRIBUTING walkthrough):
1. fetch the provider's current API docs; make one real call and save the response to
   `test/fixtures/<id>/…`.
2. write `docs/providers/<id>.md` from the template (endpoints, params, auth, quirks, why).
3. add `src/adapters/<id>.ts` implementing the port; register it in `adapters/index.ts`.
4. tests: `transform` against the fixture (mapping + malformed input) and `buildUrl`
   correctness; add the provider to the relevant mandatory-path integration tests.
5. a Changeset describing the addition.

**Credentials** — keyless by default. A caller supplies credentials per adapter id:

```ts
createQuranClient({
  credentials: { quran_foundation: { clientId: '…', secret: '…' } },
})
```

An adapter whose `auth !== 'none'` and whose credentials are absent is **skipped in
auto-selection** and **throws only if named explicitly**. The keyless happy path needs zero
config. Never read process.env inside the library — credentials arrive through options.

**CORS proxy** — adapters set `useProxy: true`; the client wraps their URL with the
configured proxy. `options.proxy` is a URL-prefix string, a `(url) => url` function, or
`false` to disable. Default: a public proxy for `useProxy` adapters only.

**Raw-text providers** — set `responseType: 'text'`; the `transform` receives the string.

## 7. Validation (optional zod entry)

Core normalizes with hand-written type guards and ships zero runtime deps. A separate,
opt-in entry point `quran-api-unified/zod` exports zod schemas mirroring the unified types
plus `parse`/`safeParse` helpers, for callers who want runtime-checked, parsed results.
`zod` is an **optional peer dependency** — importing the core never pulls it in. A
type-level test asserts the zod schemas stay structurally in sync with the TS types.

## 8. Test matrix

| Layer | Runner | Style |
| --- | --- | --- |
| `core/*` (compose, select, schema, result) | Vitest (node) | pure, table-driven, ZERO mocks; property-based for the selection/fallback combinatorics |
| `adapters/*` `transform` | Vitest (node) | run against recorded real-response **fixtures**; assert native→unified mapping + malformed/missing-field handling |
| `adapters/*` `buildUrl` | Vitest (node) | URL correct for ref / credentials / proxy |
| `http` + `client` (I/O) | Vitest + **injected fake `fetch`** | timeout, proxy wrap, json/text, retry, parallel fan-out, fallback chain, partial-results, typed-error contract |
| integration | Vitest + fixture-routed fake fetch | full `get()` composing several concerns + fallback |
| zod entry (optional) | Vitest | schemas parse valid fixtures, reject malformed |

Colocated: `module/__tests__/x.test.ts` or `x.test.ts` beside the source, shipped in the
same PR (CI-enforced). **No network-mock library** — `fetch` is injectable, so tests pass a
fake. **Opt-in live smoke** (`pnpm test:live`) hits real providers to detect upstream drift
vs the fixtures; it is NOT in the blocking CI (network-flaky) — run it manually or on a
schedule. **Cross-runtime/bundle smoke** (`pnpm smoke:bundle`) imports the built artifact as
ESM + CJS + types and drives the browser bundle via Playwright; it **gates release**.

## 9. Quality gates + npm release (manual CLI — see ADR-0009)

No GitHub Actions run right now (removed per ADR-0009). The gate suite that used to run in CI
is run **locally, by hand, before every merge and every release** — it is not optional just
because nothing enforces it automatically:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm pkg:check && pnpm docs:build && pnpm smoke:bundle
```

That covers: `lint` (+ import-boundary) · `typecheck` · `test` · `build` · `package-validate`
(`publint` + `attw`) · `docs-build` (VitePress) · `bundle-runtime-smoke` (ESM/CJS/types).

**Release** — Changesets, published from the CLI. A contributor adds a changeset
(`pnpm changeset`) describing the change; cutting a release is a manual sequence run by the
maintainer: `pnpm changeset version` (consumes changesets, bumps SemVer, writes
`CHANGELOG.md`) → `pnpm build` → `npm publish --access public` (npm CLI ≥11.5, logged in
locally via `npm login`). dist-tags: `latest` (stable) and `next` (pre-release). Pre-1.0:
MAJOR stays 0, breaking changes bump MINOR.

This is explicitly a **for-now** state (ADR-0009): the removed workflows automated exactly
this sequence via GitHub Actions + npm OIDC trusted publishing, and can come back the same way
whenever automation is wanted again.

## 10. Upstream API docs rule

Before writing or altering any adapter, **fetch the provider's current API documentation**
(web search / official docs) — endpoint shapes, auth, and rate limits move, and training
data is stale. Capture a real response as a fixture, and record *why* the transform maps as
it does in `docs/providers/<id>.md`. The scheduled live smoke is what tells you when an
upstream API has drifted away from your fixtures.
