/**
 * Typed errors — the error style is data, not exceptions (ADR-0003), with one narrow
 * exception: misuse. Provider/network failures are `QuranError` *values* that travel in a
 * `Result`/`Part`/`GetResult`; only misuse — bad config, an unknown *named* adapter, an
 * explicitly named adapter that doesn't serve the requested concern, or an explicitly
 * named adapter missing required credentials — throws.
 *
 * Import boundary (docs/stack.md §2): this module is types + pure functions only. It
 * imports nothing and must never import `core/http.ts` or anything that performs I/O.
 */

/**
 * The stable error discriminant. `configuration`, `adapter_not_found`,
 * `unsupported_capability`, and `credentials_required` are the misuse codes (thrown, per
 * {@link throwQuranError}); the rest describe provider/network outcomes and are always
 * returned as data.
 */
export type QuranErrorCode =
  | 'configuration'
  | 'adapter_not_found'
  | 'unsupported_capability'
  | 'credentials_required'
  | 'provider_http'
  | 'provider_timeout'
  | 'provider_network'
  | 'provider_parse'
  | 'all_failed'

/**
 * A typed, serializable error value. Never thrown directly for provider/network failures —
 * it rides in `Part.error` / `GetResult.error` / `Attempt.error` instead (ADR-0003).
 */
export interface QuranError {
  readonly code: QuranErrorCode
  /** Human-readable, English (the library is otherwise silent — see CONVENTIONS.md). */
  readonly message: string
  /** The adapter this error originated from, when applicable. */
  readonly adapterId?: string
  /** The upstream HTTP status, when `code` is `'provider_http'`. */
  readonly status?: number
  /** The original thrown/rejected value, kept for debugging. Shape is never guaranteed. */
  readonly cause?: unknown
}

/** Builds a {@link QuranError} value. Pure — never throws, never performs I/O. */
export function createError(
  code: QuranErrorCode,
  message: string,
  extra: Omit<QuranError, 'code' | 'message'> = {},
): QuranError {
  return { code, message, ...extra }
}

/** An `Error` carrying a {@link QuranError} on `.detail`, for the misuse-throws path. */
export interface ThrownQuranError extends Error {
  readonly detail: QuranError
}

/**
 * Throws a real, catchable `Error` whose `.detail` is the given {@link QuranError}.
 * Reserved for misuse — see the module doc. Provider/network failures must never reach
 * this function; they belong in a `Result`/`Part` instead.
 */
export function throwQuranError(error: QuranError): never {
  const err = new Error(error.message) as Error & { detail: QuranError }
  err.name = `QuranError:${error.code}`
  err.detail = error
  throw err
}
