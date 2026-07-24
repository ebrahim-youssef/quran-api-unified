/**
 * Al-Quran Cloud adapter — open, keyless, broad-coverage. Our primary text provider.
 * See `docs/providers/alquran-cloud.md`. Declarative and pure: it describes the call and
 * maps the response; it never fetches (ADR-0002).
 */

import { ALQURAN_CLOUD_BASE } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** The subset of Al-Quran Cloud's ayah response the text transform reads. */
interface AqcAyahResponse {
  readonly data: {
    readonly number: number
    readonly text: string
    readonly numberInSurah: number
    readonly juz?: number
    readonly page?: number
    readonly surah: { readonly number: number; readonly name?: string }
  }
}

/** Al-Quran Cloud (`alquran_cloud`) — verse text via `GET /ayah/{surah}:{ayah}`. */
export const alquranCloud: Adapter = {
  id: 'alquran_cloud',
  name: 'Al-Quran Cloud',
  homepage: 'https://alquran.cloud',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${ALQURAN_CLOUD_BASE}/ayah/${q.surah}:${q.ayah ?? 1}`,
    transform: (raw) => {
      const { data } = raw as AqcAyahResponse
      return {
        key: `${data.surah.number}:${data.numberInSurah}`,
        surah: data.surah.number,
        ayah: data.numberInSurah,
        source: 'Al-Quran Cloud',
        text: data.text.trim(),
        meta: { number: data.number, juz: data.juz, page: data.page },
      }
    },
  },
}
