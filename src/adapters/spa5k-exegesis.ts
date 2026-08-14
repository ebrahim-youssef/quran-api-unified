/**
 * Exegesis API (spa5k) adapter — open exegesis (tafsir) books served as static JSON over
 * jsDelivr, keyless. Our exegesis provider for v1. See `docs/providers/spa5k-tafsir.md`.
 * Declarative and pure.
 *
 * Coverage varies by edition, so a missing verse returns a provider error (an unfulfilled
 * outcome, not a whole-call failure) — the client already handles that via partial results.
 */

import type { Adapter } from '../ports/adapter.js'
import { verseKey } from './shared.js'

/** spa5k tafsir_api base — static exegesis JSON over the jsDelivr CDN. */
const SPA5K_EXEGESIS_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main'

/** A well-known Arabic exegesis edition, used when the caller names none. */
const DEFAULT_EXEGESIS = 'ar-tafsir-ibn-kathir'

/** The spa5k ayah tafsir response shape. */
interface Spa5kExegesisResponse {
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

/** Exegesis API spa5k (`spa5k_exegesis`) — via `GET /tafsir/{edition}/{chapter}/{verse}.json`. */
export const spa5kExegesis: Adapter = {
  id: 'spa5k_exegesis',
  name: 'Exegesis API (spa5k)',
  homepage: 'https://github.com/spa5k/tafsir_api',
  capabilities: ['exegesis'],
  auth: 'none',
  exegesis: {
    buildUrl: (q) =>
      `${SPA5K_EXEGESIS_BASE}/tafsir/${q.exegesisId ?? DEFAULT_EXEGESIS}/${q.chapter}/${q.verse ?? 1}.json`,
    transform: (raw, q) => {
      const r = raw as Spa5kExegesisResponse
      const exegesisId = q.exegesisId ?? DEFAULT_EXEGESIS
      return {
        key: verseKey(r.surah, r.ayah),
        chapter: r.surah,
        verse: r.ayah,
        exegesisId,
        ...(languageOf(exegesisId) != null ? { language: languageOf(exegesisId) } : {}),
        text: r.text,
      }
    },
  },
}
