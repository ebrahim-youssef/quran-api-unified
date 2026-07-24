/**
 * The composition root — `createQuranClient()` wires the injectable fetch, the adapter
 * registry, selection, and composition into the public `get()` API. This is the **only**
 * module besides `core/http` that is allowed to touch the network boundary.
 *
 * Provider/network failures are returned as data on the {@link GetResult}; only misuse —
 * bad config, or an explicitly named adapter that is unknown, non-serving, or missing
 * credentials — throws (ADR-0003).
 */

import { DEFAULT_TIMEOUT_MS } from './core/constants.js'
import { createError, throwQuranError } from './core/errors.js'
import { httpFetch, type FetchLike, type HttpDeps } from './core/http.js'
import { compose, type AttemptOutcome, type ComposeInput } from './core/compose.js'
import { select, type SourceSelection } from './core/select.js'
import type { Attempt, GetResult } from './core/result.js'
import type { AudioQuery, Ref, TafsirQuery, TranslationQuery, VerseQuery } from './core/schema.js'
import type { Adapter, AdapterContext, Capability, CapabilityHandler } from './ports/adapter.js'
import { builtinAdapters } from './adapters/index.js'

/** How to route a URL through a CORS proxy: a URL prefix, a wrapper function, or `false` to disable. */
export type ProxyOption = string | ((url: string) => string) | false

/** Options for {@link createQuranClient}. All optional — the keyless happy path needs none. */
export interface ClientOptions {
  /** Fetch implementation; defaults to `globalThis.fetch`. Required if no global fetch exists. */
  readonly fetch?: FetchLike
  /** Per-request timeout in milliseconds; defaults to {@link DEFAULT_TIMEOUT_MS}. */
  readonly timeoutMs?: number
  /** CORS proxy for adapters that opt in via `useProxy`. Disabled by default. */
  readonly proxy?: ProxyOption
  /** Extra adapters to register on top of the built-ins (override built-ins by id). */
  readonly adapters?: readonly Adapter[]
  /** Credentials per adapter id, e.g. `{ quran_foundation: { clientId, secret } }`. */
  readonly credentials?: Readonly<Record<string, Readonly<Record<string, string>>>>
}

/** A single `get()` request: a reference, the concerns to fetch, and per-concern options. */
export interface GetRequest {
  /** The ayah or surah to fetch. */
  readonly ref: Ref
  /** Which concerns to fetch; must list at least one. */
  readonly include: readonly Capability[]
  /** Reciter id for the `audio` concern. */
  readonly reciter?: string
  /** Edition id for the `translation` concern. */
  readonly edition?: string
  /** Tafsir id for the `tafsir` concern. */
  readonly tafsirId?: string
  /** Explicit source overrides per concern; unset concerns auto-select. */
  readonly source?: Partial<Record<Capability, SourceSelection>>
}

/** The client returned by {@link createQuranClient}. */
export interface QuranClient {
  /** Fetches the requested concerns, composing and falling back per ADR-0003/0004. */
  get(req: GetRequest): Promise<GetResult>
  /** Lists registered adapters, optionally filtered to those serving a capability. */
  listAdapters(capability?: Capability): readonly Adapter[]
  /** Registers (or replaces by id) an adapter; returns the client for chaining. */
  registerAdapter(adapter: Adapter): QuranClient
}

function resolveProxy(proxy: ProxyOption | undefined): ((url: string) => string) | undefined {
  if (!proxy) return undefined
  if (typeof proxy === 'function') return proxy
  return (url) => `${proxy}${url}`
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0
}

/** Defensive outcome for the unreachable case where a selected adapter lacks its handler. */
function missingHandler(adapter: Adapter, capability: Capability): AttemptOutcome<never> {
  return {
    result: {
      ok: false,
      error: createError('all_failed', `adapter "${adapter.id}" has no ${capability} handler`, {
        adapterId: adapter.id,
      }),
    },
  }
}

/** Runs one adapter attempt: build the URL, fetch, then transform. Never throws. */
async function runAttempt<Q, R>(
  handler: CapabilityHandler<Q, R>,
  adapter: Adapter,
  query: Q,
  ctx: AdapterContext,
  deps: HttpDeps,
): Promise<AttemptOutcome<R>> {
  const started = now()
  let url = handler.buildUrl(query, ctx)
  if (handler.useProxy && ctx.proxy) url = ctx.proxy(url)
  const headers = handler.headers?.(ctx)
  const res = await httpFetch(url, deps, {
    ...(handler.responseType ? { responseType: handler.responseType } : {}),
    ...(headers ? { headers } : {}),
  })
  const durationMs = now() - started
  if (!res.ok) return { result: res, durationMs }
  try {
    return { result: { ok: true, value: handler.transform(res.value, query, ctx) }, durationMs }
  } catch (cause) {
    return {
      result: {
        ok: false,
        error: createError(
          'provider_parse',
          `adapter "${adapter.id}" failed to transform its response`,
          {
            adapterId: adapter.id,
            cause,
          },
        ),
      },
      durationMs,
    }
  }
}

/**
 * Creates a Quran client over the built-in adapters plus any supplied via `options`. The
 * returned `get()` fans requested concerns out in parallel, each with its own ordered
 * preference and fallback chain.
 */
export function createQuranClient(options: ClientOptions = {}): QuranClient {
  const fetchImpl = options.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throwQuranError(
      createError('configuration', 'No fetch implementation available; pass options.fetch'),
    )
  }
  const deps: HttpDeps = { fetchImpl, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS }
  const proxy = resolveProxy(options.proxy)
  const credentials = options.credentials ?? {}

  const registry = new Map<string, Adapter>(builtinAdapters.map((a) => [a.id, a]))
  for (const adapter of options.adapters ?? []) registry.set(adapter.id, adapter)

  const hasCredentials = (id: string): boolean => {
    const c = credentials[id]
    return c != null && Object.keys(c).length > 0
  }

  const contextFor = (adapter: Adapter): AdapterContext => ({
    ...(credentials[adapter.id] ? { credentials: credentials[adapter.id] } : {}),
    ...(proxy ? { proxy } : {}),
  })

  async function get(req: GetRequest): Promise<GetResult> {
    if (req.include.length === 0) {
      throwQuranError(
        createError('configuration', 'get() requires at least one concern in include'),
      )
    }
    const adapters = [...registry.values()]

    const plan: ComposeInput = { ref: req.ref }
    const mutablePlan = plan as {
      -readonly [K in keyof ComposeInput]: ComposeInput[K]
    }

    for (const capability of req.include) {
      const selection = select({
        capability,
        adapters,
        hasCredentials,
        ...(req.source?.[capability] ? { source: req.source[capability] } : {}),
      })
      if (!selection.ok) throwQuranError(selection.error)
      const candidates = selection.value

      switch (capability) {
        case 'text': {
          const query: VerseQuery = req.ref
          mutablePlan.text = {
            candidates,
            query,
            attempt: (adapter, q) => {
              const handler = adapter.text
              if (!handler) return Promise.resolve(missingHandler(adapter, 'text'))
              return runAttempt(handler, adapter, q, contextFor(adapter), deps)
            },
          }
          break
        }
        case 'audio': {
          const query: AudioQuery = {
            ...req.ref,
            ...(req.reciter != null ? { reciter: req.reciter } : {}),
          }
          mutablePlan.audio = {
            candidates,
            query,
            attempt: (adapter, q) => {
              const handler = adapter.audio
              if (!handler) return Promise.resolve(missingHandler(adapter, 'audio'))
              return runAttempt(handler, adapter, q, contextFor(adapter), deps)
            },
          }
          break
        }
        case 'translation': {
          const query: TranslationQuery = {
            ...req.ref,
            ...(req.edition != null ? { edition: req.edition } : {}),
          }
          mutablePlan.translation = {
            candidates,
            query,
            attempt: (adapter, q) => {
              const handler = adapter.translation
              if (!handler) return Promise.resolve(missingHandler(adapter, 'translation'))
              return runAttempt(handler, adapter, q, contextFor(adapter), deps)
            },
          }
          break
        }
        case 'tafsir': {
          const query: TafsirQuery = {
            ...req.ref,
            ...(req.tafsirId != null ? { tafsirId: req.tafsirId } : {}),
          }
          mutablePlan.tafsir = {
            candidates,
            query,
            attempt: (adapter, q) => {
              const handler = adapter.tafsir
              if (!handler) return Promise.resolve(missingHandler(adapter, 'tafsir'))
              return runAttempt(handler, adapter, q, contextFor(adapter), deps)
            },
          }
          break
        }
      }
    }

    const composed = await compose(plan)
    const maybeParts = [composed.text, composed.audio, composed.translation, composed.tafsir]
    const parts = maybeParts.filter((p): p is NonNullable<typeof p> => p != null)
    const attempts: readonly Attempt[] = parts.flatMap((p) => p.attempts)

    if (parts.some((p) => p.ok)) {
      return { ok: true, value: composed, attempts }
    }
    return {
      ok: false,
      error: createError('all_failed', 'no requested concern could be served'),
      attempts,
    }
  }

  function listAdapters(capability?: Capability): readonly Adapter[] {
    const all = [...registry.values()]
    if (!capability) return all
    return all.filter((a) => a.capabilities.includes(capability) && a[capability] != null)
  }

  function registerAdapter(adapter: Adapter): QuranClient {
    registry.set(adapter.id, adapter)
    return api
  }

  const api: QuranClient = { get, listAdapters, registerAdapter }
  return api
}

let defaultClient: QuranClient | null = null

/**
 * Zero-config convenience: fetches via a lazily-created default client (built-in adapters,
 * global fetch). Equivalent to `createQuranClient().get(req)` but reuses one instance.
 */
export const get: QuranClient['get'] = (req) => (defaultClient ??= createQuranClient()).get(req)
