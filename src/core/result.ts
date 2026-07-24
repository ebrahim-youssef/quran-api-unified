/**
 * Result types — the typed-results contract from ADR-0003. `get()` never throws for a
 * provider/network failure; it returns a discriminated union, and every concern's outcome
 * is independently inspectable via {@link Part}, including its full attempt trail.
 *
 * Import boundary (docs/stack.md §2): this module imports only *types* from
 * `core/{schema,errors}` and must never import `core/http.ts` or anything that performs
 * I/O.
 */

import type { QuranError } from './errors.js'
import type {
  Ref,
  UnifiedAudio,
  UnifiedTafsir,
  UnifiedTranslation,
  UnifiedVerse,
} from './schema.js'

/** A generic result union for building blocks outside the composed `get()` shape. */
export type Result<T, E = QuranError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

/** One provider attempt within a concern's fallback chain, in the order it was tried. */
export interface Attempt {
  readonly adapterId: string
  readonly ok: boolean
  readonly error?: QuranError
  /** Wall-clock time for this attempt, when measured. */
  readonly durationMs?: number
}

/**
 * One concern's outcome inside a composed `get()` result. Partial results are first-class
 * (ADR-0003): a failed `Part` does not fail the whole call, only that concern.
 */
export interface Part<T> {
  readonly ok: boolean
  readonly value?: T
  readonly error?: QuranError
  /** The adapter id that served this concern, when `ok` is true. */
  readonly source?: string
  /**
   * The provider's original, un-normalized response body — the exact value the adapter's
   * `transform` received. Present only when the caller requested it via `includeRaw`
   * (ADR-0010); absent otherwise, so results stay lean by default.
   */
  readonly raw?: unknown
  /** Every provider tried for this concern, in order. */
  readonly attempts: readonly Attempt[]
}

/**
 * Builds a successful {@link Part}. Pure — never throws, never performs I/O. Pass `raw` to
 * attach the provider's original response body (opt-in raw passthrough, ADR-0010).
 */
export function okPart<T>(
  value: T,
  source: string,
  attempts: readonly Attempt[],
  raw?: unknown,
): Part<T> {
  return { ok: true, value, source, attempts, ...(raw === undefined ? {} : { raw }) }
}

/** Builds a failed {@link Part}. Pure — never throws, never performs I/O. */
export function errPart<T>(error: QuranError, attempts: readonly Attempt[]): Part<T> {
  return { ok: false, error, attempts }
}

/** The composed result of a single `get()` call — one `Part` per requested concern. */
export interface Composed {
  readonly ref: Ref
  readonly text?: Part<UnifiedVerse>
  readonly audio?: Part<UnifiedAudio>
  readonly translation?: Part<UnifiedTranslation>
  readonly tafsir?: Part<UnifiedTafsir>
}

/**
 * The top-level `get()` result. `ok:false` here means total inability to serve *any*
 * requested concern, or misuse; a single unfulfilled concern among several successes still
 * reports `ok:true` with that concern's `Part` marked failed (ADR-0003).
 */
export type GetResult =
  | { readonly ok: true; readonly value: Composed; readonly attempts: readonly Attempt[] }
  | { readonly ok: false; readonly error: QuranError; readonly attempts: readonly Attempt[] }
