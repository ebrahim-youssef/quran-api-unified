/**
 * Al-Quran Cloud adapter — open, keyless, broad-coverage. Our primary text provider.
 * See `docs/providers/alquran-cloud.md`. Declarative and pure: it describes the call and
 * maps the response; it never fetches (ADR-0002).
 */

import { ALQURAN_CLOUD_BASE } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** The default recitation edition used when the caller names no reciter. */
const DEFAULT_RECITER = 'ar.alafasy'

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

/** The subset of Al-Quran Cloud's audio-edition response the audio transform reads. */
interface AqcAudioResponse {
  readonly data: {
    readonly numberInSurah: number
    readonly surah: { readonly number: number }
    readonly audio: string
    readonly audioSecondary?: readonly string[]
    readonly edition?: { readonly identifier?: string }
  }
}

/** Al-Quran Cloud (`alquran_cloud`) — verse text and ayah recitation audio, keyless. */
export const alquranCloud: Adapter = {
  id: 'alquran_cloud',
  name: 'Al-Quran Cloud',
  homepage: 'https://alquran.cloud',
  capabilities: ['text', 'audio'],
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
  audio: {
    buildUrl: (q) =>
      `${ALQURAN_CLOUD_BASE}/ayah/${q.surah}:${q.ayah ?? 1}/${q.reciter ?? DEFAULT_RECITER}`,
    transform: (raw, q) => {
      const { data } = raw as AqcAudioResponse
      return {
        key: `${data.surah.number}:${data.numberInSurah}`,
        surah: data.surah.number,
        ayah: data.numberInSurah,
        scope: 'ayah',
        source: 'Al-Quran Cloud',
        reciter: data.edition?.identifier ?? q.reciter ?? DEFAULT_RECITER,
        url: data.audio,
        format: 'mp3',
        meta: { audioSecondary: data.audioSecondary },
      }
    },
  },
}
