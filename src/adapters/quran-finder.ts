/**
 * Quran Explorer (Quran Finder) adapter — serves the ayah as a raw text string, not JSON, so
 * the handler sets `responseType: 'text'`. The response has no position data, so `key`, `surah`,
 * and `ayah` come from the request. Needs a CORS proxy from the browser. See
 * `docs/providers/quran-finder.md`.
 */

import type { Adapter } from '../ports/adapter.js'
import { stripBom, verseKey } from './shared.js'

/** Quran Explorer (Quran Finder) base — raw-text ayah endpoint. */
const QURAN_FINDER_BASE = 'https://api.quran-finder.com'

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
        key: verseKey(q.surah, ayah),
        surah: q.surah,
        ayah,
        source: 'Quran Explorer',
        text: stripBom(String(raw)).trim(),
        meta: { type: 'raw' },
      }
    },
  },
}
