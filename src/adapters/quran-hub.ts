/**
 * Quran Hub adapter — keyless text with an Al-Quran-Cloud-compatible shape. Needs a CORS proxy
 * from the browser, so the handler sets `useProxy: true`. See `docs/providers/quran-hub.md`.
 */

import type { Adapter } from '../ports/adapter.js'
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

/** Quran Hub (`quran_hub`) — verse text via `GET /ayah/{surah}:{ayah}` (proxy from browser). */
export const quranHub: Adapter = {
  id: 'quran_hub',
  name: 'Quran Hub',
  homepage: 'https://quranhub.app',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${QURAN_HUB_BASE}/ayah/${verseKey(q.surah, q.ayah)}`,
    useProxy: true,
    transform: (raw) => {
      const { data } = raw as HubAyahResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        surah: data.surah.number,
        ayah: data.numberInSurah,
        source: 'Quran Hub',
        text: stripBom(data.text).trim(),
        meta: { number: data.number, juz: data.juz, surahName: data.surah.name },
      }
    },
  },
}
