/**
 * Quran Explorer (Quran Finder) adapter — serves the ayah as a raw text string, not JSON, so
 * the handler sets `responseType: 'text'`. The response has no position data, so `key`, `surah`,
 * and `ayah` come from the request. Needs a CORS proxy from the browser. See
 * `docs/providers/quran-finder.md`.
 */

import { QURAN_FINDER_BASE } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** Strips a leading byte-order mark (U+FEFF), which this provider prefixes onto the text. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/** Quran Explorer (`quran_finder`) — raw-text verse via `GET /text/ar/{surah}/{ayah}/`. */
export const quranFinder: Adapter = {
  id: 'quran_finder',
  name: 'Quran Explorer',
  homepage: 'https://quran-finder.com',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${QURAN_FINDER_BASE}/text/ar/${q.surah}/${q.ayah ?? 1}/`,
    responseType: 'text',
    useProxy: true,
    transform: (raw, q) => {
      const ayah = q.ayah ?? 1
      return {
        key: `${q.surah}:${ayah}`,
        surah: q.surah,
        ayah,
        source: 'Quran Explorer',
        text: stripBom(String(raw)).trim(),
        meta: { type: 'raw' },
      }
    },
  },
}
