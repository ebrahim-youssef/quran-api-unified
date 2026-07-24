/**
 * Provider selection (v1) — ordered preference + fallback, per concern (ADR-0004). Pure and
 * strategy-pluggable: given the registry and an optional caller override, it returns the
 * ordered list of adapters to try for one capability. It performs **no I/O** and never
 * imports `core/http`.
 *
 * Auto mode (no `source`) uses registration order and silently skips adapters that need
 * credentials the caller didn't supply. Explicit mode (a named `source`) is validated
 * strictly: an unknown id, an adapter that doesn't serve the capability, or one missing
 * required credentials is **misuse** — returned as an error the client throws (ADR-0003/0005).
 */

import { createError, type QuranError } from './errors.js'
import type { Result } from './result.js'
import type { Adapter, Capability } from '../ports/adapter.js'

/**
 * A caller's explicit source override for one concern: a primary adapter `id` plus an
 * optional own `fallback` chain. When omitted, the SDK auto-selects (registration order).
 */
export interface SourceSelection {
  /** The adapter to try first. */
  readonly id: string
  /** Adapters to try, in order, if the primary fails. */
  readonly fallback?: readonly string[]
}

/** Inputs to {@link select} for a single capability. */
export interface SelectInput {
  /** The concern being selected for. */
  readonly capability: Capability
  /** The full registry, in registration order. */
  readonly adapters: readonly Adapter[]
  /** The caller's explicit override for this concern, if any. */
  readonly source?: SourceSelection
  /** Whether the caller supplied usable credentials for an adapter id. */
  readonly hasCredentials: (adapterId: string) => boolean
}

function serves(adapter: Adapter, capability: Capability): boolean {
  return adapter.capabilities.includes(capability) && adapter[capability] != null
}

function credentialsSatisfied(
  adapter: Adapter,
  hasCredentials: (adapterId: string) => boolean,
): boolean {
  return adapter.auth == null || adapter.auth === 'none' || hasCredentials(adapter.id)
}

/**
 * Computes the ordered adapters to try for one capability. Returns `ok` with the (possibly
 * empty) candidate list in auto mode; in explicit mode returns a misuse `QuranError` for an
 * unknown, non-serving, or under-credentialed named adapter. An empty auto result is not an
 * error — the composing layer reports it as a failed part (partial results, ADR-0003).
 */
export function select(input: SelectInput): Result<readonly Adapter[], QuranError> {
  const { capability, adapters, source, hasCredentials } = input
  const byId = new Map(adapters.map((a) => [a.id, a]))

  if (source) {
    const ids = [source.id, ...(source.fallback ?? [])]
    const resolved: Adapter[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      const adapter = byId.get(id)
      if (!adapter) {
        return {
          ok: false,
          error: createError('adapter_not_found', `no adapter registered with id "${id}"`, {
            adapterId: id,
          }),
        }
      }
      if (!serves(adapter, capability)) {
        return {
          ok: false,
          error: createError(
            'unsupported_capability',
            `adapter "${id}" does not serve ${capability}`,
            { adapterId: id },
          ),
        }
      }
      if (!credentialsSatisfied(adapter, hasCredentials)) {
        return {
          ok: false,
          error: createError(
            'credentials_required',
            `adapter "${id}" requires credentials to serve ${capability}`,
            { adapterId: id },
          ),
        }
      }
      resolved.push(adapter)
    }
    return { ok: true, value: resolved }
  }

  const candidates = adapters.filter(
    (a) => serves(a, capability) && credentialsSatisfied(a, hasCredentials),
  )
  return { ok: true, value: candidates }
}
