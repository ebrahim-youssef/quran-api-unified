/**
 * Quran API (Edge) adapter — a fast static edge API returning text (and audio) for an ayah in
 * one JSON file. Keyless. See `docs/providers/quran-api-edge.md`. Declarative and pure.
 */

import { QURAN_API_EDGE_BASE } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** The subset of the Edge ayah file the text transform reads. */
interface EdgeAyahResponse {
  readonly surahNo: number
  readonly ayahNo: number
  readonly arabic1: string
  readonly arabic2?: string
  readonly english?: string
  readonly surahNameArabic?: string
}

/** Quran API Edge (`quran_api_edge`) — verse text via `GET /{surah}/{ayah}.json`. */
export const quranApiEdge: Adapter = {
  id: 'quran_api_edge',
  name: 'Quran API (Edge)',
  homepage: 'https://quranapi.pages.dev',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${QURAN_API_EDGE_BASE}/${q.surah}/${q.ayah ?? 1}.json`,
    transform: (raw) => {
      const r = raw as EdgeAyahResponse
      return {
        key: `${r.surahNo}:${r.ayahNo}`,
        surah: r.surahNo,
        ayah: r.ayahNo,
        source: 'Quran API (Edge)',
        text: r.arabic1,
        meta: { arabic2: r.arabic2, english: r.english, surahName: r.surahNameArabic },
      }
    },
  },
}
