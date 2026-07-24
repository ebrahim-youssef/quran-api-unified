/**
 * Tafsir API (spa5k) adapter — open tafsir books served as static JSON over jsDelivr, keyless.
 * Our tafsir provider for v1. See `docs/providers/spa5k-tafsir.md`. Declarative and pure.
 *
 * Coverage varies by edition, so a missing ayah returns a provider error (an unfulfilled part,
 * not a whole-call failure) — the client already handles that via partial results.
 */

import { SPA5K_TAFSIR_BASE } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** A well-known Arabic tafsir edition, used when the caller names none. */
const DEFAULT_TAFSIR = 'ar-tafsir-ibn-kathir'

/** The spa5k ayah tafsir response shape. */
interface Spa5kTafsirResponse {
  readonly surah: number
  readonly ayah: number
  readonly text: string
}

/** Derives a language tag from an edition slug prefix (`en-…`, `ar-…`), when present. */
function languageOf(edition: string): string | undefined {
  const prefix = edition.slice(0, edition.indexOf('-'))
  return prefix === 'en' || prefix === 'ar' || prefix === 'ur' || prefix === 'bn'
    ? prefix
    : undefined
}

/** Tafsir API spa5k (`spa5k_tafsir`) — via `GET /tafsir/{edition}/{surah}/{ayah}.json`. */
export const spa5kTafsir: Adapter = {
  id: 'spa5k_tafsir',
  name: 'Tafsir API (spa5k)',
  homepage: 'https://github.com/spa5k/tafsir_api',
  capabilities: ['tafsir'],
  auth: 'none',
  tafsir: {
    buildUrl: (q) =>
      `${SPA5K_TAFSIR_BASE}/tafsir/${q.tafsirId ?? DEFAULT_TAFSIR}/${q.surah}/${q.ayah ?? 1}.json`,
    transform: (raw, q) => {
      const r = raw as Spa5kTafsirResponse
      const tafsirId = q.tafsirId ?? DEFAULT_TAFSIR
      return {
        key: `${r.surah}:${r.ayah}`,
        surah: r.surah,
        ayah: r.ayah,
        source: 'Tafsir API (spa5k)',
        tafsirId,
        text: r.text,
        meta: { language: languageOf(tafsirId) },
      }
    },
  },
}
