/**
 * `quran-api-unified` — one consistent interface over multiple Quran text, audio,
 * translation, and tafsir providers, with provider selection and automatic fallback.
 *
 * This is the public API surface (named exports only; no default export). The unified
 * schema, result, and error types are the stable contract every provider normalizes into;
 * the client factory and adapter port compose them into the `get()` API.
 *
 * @packageDocumentation
 */

/**
 * Library version marker. Superseded by the client API in a later ticket; present so
 * the packaged surface is non-empty and consumers can sanity-check their install.
 */
export const VERSION = '0.0.0'

// The client factory + its default convenience binding, and the request/option types.
export { createQuranClient, get } from './client.js'
export type { ClientOptions, GetRequest, ProxyOption, QuranClient } from './client.js'

// The adapter port — consumers implement this to register custom providers.
export type {
  Adapter,
  AdapterContext,
  AuthKind,
  Capability,
  CapabilityHandler,
  ResponseType,
} from './ports/adapter.js'
export type { FetchLike } from './core/http.js'
export type { SourceSelection } from './core/select.js'
export { builtinAdapters } from './adapters/index.js'

// The unified schema — the shapes every provider is normalized into (ticket #3).
export type {
  Ref,
  UnifiedMeta,
  VerseQuery,
  UnifiedVerse,
  AudioQuery,
  UnifiedAudio,
  TranslationQuery,
  UnifiedTranslation,
  TafsirQuery,
  UnifiedTafsir,
} from './core/schema.js'

// Typed results — the errors-are-data contract from ADR-0003.
export type { Result, Attempt, Part, Composed, GetResult } from './core/result.js'
export { okPart, errPart } from './core/result.js'

// Typed errors — data for provider/network failures; thrown only for misuse.
export type { QuranErrorCode, QuranError, ThrownQuranError } from './core/errors.js'
export { createError, throwQuranError } from './core/errors.js'
