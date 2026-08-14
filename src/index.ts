/**
 * `quran-api-unified` — one consistent interface over multiple Quran text, audio,
 * translation, and exegesis providers, with provider selection and automatic fallback.
 *
 * This is the public API surface (named exports only; no default export). The unified
 * schema, result, and error types are the stable contract every provider normalizes into;
 * the client factory and adapter port compose them into the `get()` API.
 *
 * @packageDocumentation
 */

// The canonical schema's own version (ADR-0012) — independent of the npm package version.
export { SCHEMA_VERSION } from './core/constants.js'

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
  OAuth2ClientConfig,
  ResponseType,
} from './ports/adapter.js'
export type { FetchLike } from './core/http.js'
export type { SourceSelection } from './core/select.js'
export { builtinAdapters } from './adapters/index.js'

// Canonical identity and provenance primitives (ADR-0013, ADR-0014).
export type { LocalizedName, Provenance, ResourceRef } from './core/identity.js'

// The unified schema — the shapes every provider is normalized into.
export type {
  AudioQuery,
  ExegesisQuery,
  Ref,
  StructuralPosition,
  TranslationQuery,
  UnifiedAudio,
  UnifiedExegesis,
  UnifiedMeta,
  UnifiedTranslation,
  UnifiedVerse,
  VerseQuery,
} from './core/schema.js'

// Typed results — the errors-are-data contract from ADR-0003.
export type { Attempt, Composed, GetResult, Outcome, Result } from './core/result.js'
export { errOutcome, okOutcome } from './core/result.js'

// Per-word data and the ayah/slot/word alignment layer (ADR-0015, ADR-0016).
export type { UnifiedWord, UnifiedWordSlot } from './core/words.js'

// Typed errors — data for provider/network failures; thrown only for misuse.
export type { QuranErrorCode, QuranError, ThrownQuranError } from './core/errors.js'
export { createError, throwQuranError } from './core/errors.js'
