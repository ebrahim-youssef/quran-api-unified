/**
 * Quran Hub adapter — keyless text with an Al-Quran-Cloud-compatible shape. Needs a CORS proxy
 * from the browser, so the handler sets `useProxy: true`. See `docs/providers/quran-hub.md`.
 */

import type { Adapter } from '../ports/adapter.js'
import type { StructuralPosition } from '../core/schema.js'
import { stripBom, verseKey } from './shared.js'

/** Quran Hub API base (text; Al-Quran-Cloud-compatible shape). */
const QURAN_HUB_BASE = 'https://api.quranhub.com/v1'

/** The subset of Quran Hub's ayah response the text transform reads. */
interface HubAyahResponse {
  readonly data: {
    readonly number: number
    readonly text: string
    readonly numberInSurah: number
    readonly juz?: number
    readonly surah: { readonly number: number; readonly name?: string }
  }
}

/** See `alquran-cloud.ts` for why this is a placeholder pending the structure registry. */
function placeholderStructure(): StructuralPosition {
  return { part: 1, group: 1, quarter: 1 }
}

/** Quran Hub (`quran_hub`) — verse text via `GET /ayah/{chapter}:{verse}` (proxy from browser). */
export const quranHub: Adapter = {
  id: 'quran_hub',
  name: 'Quran Hub',
  homepage: 'https://quranhub.app',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${QURAN_HUB_BASE}/ayah/${verseKey(q.chapter, q.verse)}`,
    useProxy: true,
    transform: (raw) => {
      const { data } = raw as HubAyahResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number,
        verse: data.numberInSurah,
        text: stripBom(data.text).trim(),
        structure: placeholderStructure(),
      }
    },
  },
}
