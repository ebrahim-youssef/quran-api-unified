/**
 * Result types — the typed-results contract from ADR-0003. `get()` never throws for a
 * provider/network failure; it returns a discriminated union, and every concern's outcome
 * is independently inspectable via {@link Outcome}, including its full attempt trail.
 *
 * Import boundary (docs/stack.md §2): this module imports only *types* from
 * `core/{schema,errors,identity}` and the `SCHEMA_VERSION` constant, and must never import
 * `core/http.ts` or anything that performs I/O.
 */

import { SCHEMA_VERSION } from './constants.js'
import type { QuranError } from './errors.js'
import type { Provenance } from './identity.js'
import type {
  Ref,
  UnifiedAudio,
  UnifiedExegesis,
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
 * (ADR-0003): a failed `Outcome` does not fail the whole call, only that concern.
 * `schemaVersion` (ADR-0012) and `provenance` (ADR-0014) make an `Outcome` self-describing
 * even when extracted independently of the rest of the envelope.
 */
export interface Outcome<T> {
  readonly ok: boolean
  /** The schema shape this outcome was built against (ADR-0012). */
  readonly schemaVersion: string
  readonly value?: T
  readonly error?: QuranError
  /** Where the value came from, when `ok` is true (ADR-0014). */
  readonly provenance?: Provenance
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
 * Builds a successful {@link Outcome}. Pure — never throws, never performs I/O. `schemaVersion`
 * is always the current {@link SCHEMA_VERSION}, so it can never drift between outcomes built in
 * the same call.
 */
export function okOutcome<T>(
  value: T,
  attempts: readonly Attempt[],
  provenance?: Provenance,
  raw?: unknown,
): Outcome<T> {
  return {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    value,
    attempts,
    ...(provenance ? { provenance } : {}),
    ...(raw === undefined ? {} : { raw }),
  }
}

/** Builds a failed {@link Outcome}. Pure — never throws, never performs I/O. */
export function errOutcome<T>(error: QuranError, attempts: readonly Attempt[]): Outcome<T> {
  return { ok: false, schemaVersion: SCHEMA_VERSION, error, attempts }
}

/** The composed result of a single `get()` call — one `Outcome` per requested concern. */
export interface Composed {
  readonly ref: Ref
  readonly text?: Outcome<UnifiedVerse>
  readonly audio?: Outcome<UnifiedAudio>
  readonly translation?: Outcome<UnifiedTranslation>
  readonly exegesis?: Outcome<UnifiedExegesis>
}

/**
 * The top-level `get()` result. `ok:false` here means total inability to serve *any*
 * requested concern, or misuse; a single unfulfilled concern among several successes still
 * reports `ok:true` with that concern's `Outcome` marked failed (ADR-0003). Both branches
 * carry `schemaVersion` (ADR-0012).
 */
export type GetResult =
  | {
      readonly ok: true
      readonly schemaVersion: string
      readonly value: Composed
      readonly attempts: readonly Attempt[]
    }
  | {
      readonly ok: false
      readonly schemaVersion: string
      readonly error: QuranError
      readonly attempts: readonly Attempt[]
    }
