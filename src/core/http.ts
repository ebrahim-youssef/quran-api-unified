/**
 * The I/O leaf — the ONLY module in the library that is allowed to touch the network.
 *
 * Import-boundary target: adapters and the pure core (`compose` / `select`) must never
 * import this file (enforced by ESLint). Only the client's fetch layer wires it in.
 *
 * Failures are returned as data, never thrown: `httpFetch` resolves to a `Result` carrying a
 * typed {@link QuranError} on the error branch (ADR-0003). `throwQuranError` is reserved for
 * misuse and is not used here — a slow or broken provider is an expected outcome, not misuse.
 */

import { createError, type QuranError } from './errors.js'
import type { Result } from './result.js'
import type { ResponseType } from '../ports/adapter.js'

/** A minimal `fetch`-compatible function; injected so the library stays runtime-agnostic. */
export type FetchLike = typeof globalThis.fetch

/** Dependencies the I/O leaf needs, supplied by the client (never read from globals here). */
export interface HttpDeps {
  /** The fetch implementation to use (defaults resolved at the client layer). */
  readonly fetchImpl: FetchLike
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs: number
}

/** Per-request options for a single fetch. */
export interface HttpRequest {
  /** How to read the body; defaults to `'json'`. */
  readonly responseType?: ResponseType
  /** Extra request headers. */
  readonly headers?: Record<string, string>
  /** HTTP method; defaults to `GET`. */
  readonly method?: string
  /** Request body (e.g. a form-encoded OAuth2 token request). */
  readonly body?: string
}

function requestInit(opts: HttpRequest, signal: AbortSignal): RequestInit {
  return {
    signal,
    ...(opts.method ? { method: opts.method } : {}),
    ...(opts.headers ? { headers: opts.headers } : {}),
    ...(opts.body != null ? { body: opts.body } : {}),
  }
}

function networkErrorResult(
  url: string,
  timeoutMs: number,
  timedOut: boolean,
  cause: unknown,
): Result<never, QuranError> {
  return {
    ok: false,
    error: createError(
      timedOut ? 'provider_timeout' : 'provider_network',
      timedOut
        ? `Request to ${url} timed out after ${timeoutMs}ms`
        : `Network error requesting ${url}`,
      { cause },
    ),
  }
}

function parseErrorResult(
  url: string,
  responseType: ResponseType | undefined,
  cause: unknown,
): Result<never, QuranError> {
  return {
    ok: false,
    error: createError(
      'provider_parse',
      `Failed to parse ${responseType ?? 'json'} response from ${url}`,
      { cause },
    ),
  }
}

/**
 * Fetches `url` with a timeout and reads the body as JSON (default) or text. Every failure —
 * timeout, network error, non-2xx status, or a body that won't parse — resolves to
 * `{ ok: false, error }` with a typed {@link QuranError}; a success resolves to
 * `{ ok: true, value }` holding the parsed body as `unknown` for an adapter's `transform` to
 * narrow. Never throws for a provider/network failure.
 */
export async function httpFetch(
  url: string,
  deps: HttpDeps,
  opts: HttpRequest = {},
): Promise<Result<unknown, QuranError>> {
  const { fetchImpl, timeoutMs } = deps
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res: Response
    try {
      res = await fetchImpl(url, requestInit(opts, controller.signal))
    } catch (cause) {
      return networkErrorResult(url, timeoutMs, controller.signal.aborted, cause)
    }

    if (!res.ok) {
      return {
        ok: false,
        error: createError('provider_http', `HTTP ${res.status} from ${url}`, {
          status: res.status,
        }),
      }
    }

    try {
      const value = opts.responseType === 'text' ? await res.text() : await res.json()
      return { ok: true, value }
    } catch (cause) {
      return parseErrorResult(url, opts.responseType, cause)
    }
  } finally {
    clearTimeout(timer)
  }
}
