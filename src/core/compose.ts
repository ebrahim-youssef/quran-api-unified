/**
 * Composition (v1) — fan out the requested concerns **in parallel**, run each concern's
 * ordered fallback chain, and merge the outcomes into one {@link Composed} result (ADR-0004).
 *
 * Pure orchestration: it performs **no I/O** and never imports `core/http`. The actual per-
 * adapter attempt (buildUrl → fetch → transform) arrives as an injected `attempt` closure, so
 * the fallback/partial-results logic here is deterministic and unit-testable without a network.
 */

import { createError, type QuranError } from './errors.js'
import type { Provenance } from './identity.js'
import {
  errOutcome,
  okOutcome,
  type Attempt,
  type Composed,
  type Outcome,
  type Result,
} from './result.js'
import type {
  AudioQuery,
  ExegesisQuery,
  Ref,
  TranslationQuery,
  UnifiedAudio,
  UnifiedExegesis,
  UnifiedTranslation,
  UnifiedVerse,
  VerseQuery,
} from './schema.js'
import type { Adapter } from '../ports/adapter.js'

/** The outcome of a single adapter attempt: its typed result plus optional measured latency. */
export interface AttemptOutcome<R> {
  readonly result: Result<R, QuranError>
  readonly durationMs?: number
  /** Where the value came from, when the attempt succeeded (ADR-0014). */
  readonly provenance?: Provenance
  /** The provider's original response body, when the caller requested raw passthrough (ADR-0010). */
  readonly raw?: unknown
}

/** Everything needed to run one concern's fallback chain. */
export interface ConcernExecution<Q, R> {
  /** Ordered adapters to try (from {@link select}). */
  readonly candidates: readonly Adapter[]
  /** The resolved query for this concern. */
  readonly query: Q
  /** Runs one adapter against the query. Injected by the client (the only I/O boundary). */
  readonly attempt: (adapter: Adapter, query: Q) => Promise<AttemptOutcome<R>>
}

/** The set of concerns to compose for one `get()` call; omit a concern to skip it. */
export interface ComposeInput {
  readonly ref: Ref
  readonly text?: ConcernExecution<VerseQuery, UnifiedVerse>
  readonly audio?: ConcernExecution<AudioQuery, UnifiedAudio>
  readonly translation?: ConcernExecution<TranslationQuery, UnifiedTranslation>
  readonly exegesis?: ConcernExecution<ExegesisQuery, UnifiedExegesis>
}

/** Tries each candidate in order, stopping at the first success; records every attempt. */
async function runChain<Q, R>(exec: ConcernExecution<Q, R>): Promise<Outcome<R>> {
  const attempts: Attempt[] = []
  for (const adapter of exec.candidates) {
    const { result, durationMs, provenance, raw } = await exec.attempt(adapter, exec.query)
    const attempt: Attempt = {
      adapterId: adapter.id,
      ok: result.ok,
      ...(result.ok ? {} : { error: result.error }),
      ...(durationMs == null ? {} : { durationMs }),
    }
    attempts.push(attempt)
    if (result.ok) return okOutcome(result.value, attempts, provenance, raw)
  }
  const error =
    attempts.length > 0
      ? createError('all_failed', `all ${attempts.length} provider(s) failed for the concern`)
      : createError('all_failed', 'no adapter available to serve the concern')
  return errOutcome(error, attempts)
}

/**
 * Runs all requested concerns concurrently and assembles the {@link Composed} result. A failed
 * concern does not fail the others — its `Outcome` is marked failed and carries its attempt
 * trail (partial results are first-class, ADR-0003).
 */
export async function compose(input: ComposeInput): Promise<Composed> {
  const [text, audio, translation, exegesis] = await Promise.all([
    input.text ? runChain(input.text) : undefined,
    input.audio ? runChain(input.audio) : undefined,
    input.translation ? runChain(input.translation) : undefined,
    input.exegesis ? runChain(input.exegesis) : undefined,
  ])
  return {
    ref: input.ref,
    ...(text ? { text } : {}),
    ...(audio ? { audio } : {}),
    ...(translation ? { translation } : {}),
    ...(exegesis ? { exegesis } : {}),
  }
}
