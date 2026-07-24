/**
 * The Adapter port — the single contract every provider implements (ADR-0005). An adapter
 * is **declarative**: per concern it exposes a `buildUrl` recipe plus a **pure** `transform`
 * that maps the provider's native response into the unified schema. Adapters never fetch;
 * only the client's I/O leaf (`core/http.ts`) touches the network (ADR-0002).
 *
 * Import boundary (docs/stack.md §2): this module imports only *types* from `core/schema`.
 * It must never import `core/http`, the client, or anything that performs I/O.
 */

import type {
  AudioQuery,
  TafsirQuery,
  TranslationQuery,
  UnifiedAudio,
  UnifiedTafsir,
  UnifiedTranslation,
  UnifiedVerse,
  VerseQuery,
} from '../core/schema.js'

/** A concern an adapter can serve. */
export type Capability = 'text' | 'audio' | 'translation' | 'tafsir'

/** How the I/O leaf should read a provider's response body. */
export type ResponseType = 'json' | 'text'

/**
 * An adapter's credential requirement. `none` is keyless (the default happy path); the
 * others need credentials supplied per adapter id via client options (ADR-0005).
 */
export type AuthKind = 'none' | 'apiKey' | 'oauth2-client'

/**
 * Per-call context handed to an adapter's `buildUrl`/`transform`/`headers`. Credentials and
 * the proxy wrapper arrive here from client options — an adapter never reads `process.env`.
 */
export interface AdapterContext {
  /** Credentials for this adapter id, when the caller supplied them. */
  readonly credentials?: Readonly<Record<string, string>>
  /** Wraps a URL for a CORS proxy, when one is configured and the handler opts in. */
  readonly proxy?: (url: string) => string
}

/**
 * One concern's handler. `transform` is **pure** — no I/O, no `Date.now()`, no randomness —
 * so it is trivially testable against a recorded fixture. `raw` is `unknown` (untyped
 * upstream data); an implementation narrows it internally and never leaks `any` outward.
 */
export interface CapabilityHandler<Q, R> {
  /** Builds the request URL for a query. Pure. */
  readonly buildUrl: (q: Q, ctx: AdapterContext) => string
  /** Maps the raw provider response to the unified shape. Pure — no I/O. */
  readonly transform: (raw: unknown, q: Q, ctx: AdapterContext) => R
  /** How to read the body; defaults to `'json'`. */
  readonly responseType?: ResponseType
  /** Route the built URL through `ctx.proxy` when one is configured. */
  readonly useProxy?: boolean
  /** Extra request headers (e.g. an auth token derived from `ctx.credentials`). */
  readonly headers?: (ctx: AdapterContext) => Record<string, string>
}

/**
 * A provider adapter. Declares a unique `id`, a display `name`, the `capabilities` it serves,
 * its `auth` requirement, and a handler per capability it supports. Register custom adapters
 * via `registerAdapter()` to make them selectable, including in the fallback chain.
 */
export interface Adapter {
  /** Unique, stable, snake_case identifier, e.g. `'alquran_cloud'`. */
  readonly id: string
  /** Human-readable provider name, surfaced as a result's `source`. */
  readonly name: string
  /** Provider homepage, for docs and diagnostics. */
  readonly homepage?: string
  /** The concerns this adapter can serve. */
  readonly capabilities: readonly Capability[]
  /** Credential requirement; defaults to `'none'` (keyless). */
  readonly auth?: AuthKind
  /** Verse-text handler, present when `capabilities` includes `'text'`. */
  readonly text?: CapabilityHandler<VerseQuery, UnifiedVerse>
  /** Audio handler, present when `capabilities` includes `'audio'`. */
  readonly audio?: CapabilityHandler<AudioQuery, UnifiedAudio>
  /** Translation handler, present when `capabilities` includes `'translation'`. */
  readonly translation?: CapabilityHandler<TranslationQuery, UnifiedTranslation>
  /** Tafsir handler, present when `capabilities` includes `'tafsir'`. */
  readonly tafsir?: CapabilityHandler<TafsirQuery, UnifiedTafsir>
}
