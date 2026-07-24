/**
 * Quran Hub adapter — keyless text with an Al-Quran-Cloud-compatible shape. Needs a CORS proxy
 * from the browser, so the handler sets `useProxy: true`. See `docs/providers/quran-hub.md`.
 */

import { QURAN_HUB_BASE } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** Strips a leading byte-order mark (U+FEFF), which this provider prefixes onto the text. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

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
    buildUrl: (q) => `${QURAN_HUB_BASE}/ayah/${q.surah}:${q.ayah ?? 1}`,
    useProxy: true,
    transform: (raw) => {
      const { data } = raw as HubAyahResponse
      return {
        key: `${data.surah.number}:${data.numberInSurah}`,
        surah: data.surah.number,
        ayah: data.numberInSurah,
        source: 'Quran Hub',
        text: stripBom(data.text).trim(),
        meta: { number: data.number, juz: data.juz, surahName: data.surah.name },
      }
    },
  },
}
