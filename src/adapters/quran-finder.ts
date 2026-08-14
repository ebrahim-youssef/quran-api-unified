/**
 * Quran Explorer (Quran Finder) adapter — serves the ayah as a raw text string, not JSON, so
 * the handler sets `responseType: 'text'`. The response has no position data, so `key`,
 * `chapter`, and `verse` come from the request. Needs a CORS proxy from the browser. See
 * `docs/providers/quran-finder.md`.
 */

import type { Adapter } from '../ports/adapter.js'
import type { StructuralPosition } from '../core/schema.js'
import { stripBom, verseKey } from './shared.js'

/** Quran Explorer (Quran Finder) base — raw-text ayah endpoint. */
const QURAN_FINDER_BASE = 'https://api.quran-finder.com'

/** See `alquran-cloud.ts` for why this is a placeholder pending the structure registry. */
function placeholderStructure(): StructuralPosition {
  return { part: 1, group: 1, quarter: 1 }
}

/** Quran Explorer (`quran_finder`) — raw-text verse via `GET /text/ar/{chapter}/{verse}/`. */
export const quranFinder: Adapter = {
  id: 'quran_finder',
  name: 'Quran Explorer',
  homepage: 'https://quran-finder.com',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${QURAN_FINDER_BASE}/text/ar/${q.chapter}/${q.verse ?? 1}/`,
    responseType: 'text',
    useProxy: true,
    transform: (raw, q) => {
      const verse = q.verse ?? 1
      return {
        key: verseKey(q.chapter, verse),
        chapter: q.chapter,
        verse,
        text: stripBom(String(raw)).trim(),
        structure: placeholderStructure(),
      }
    },
  },
}
