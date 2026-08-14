/**
 * Al-Quran Cloud adapter — open, keyless, broad-coverage. Our primary text provider.
 * See `docs/providers/alquran-cloud.md`. Declarative and pure: it describes the call and
 * maps the response; it never fetches (ADR-0002).
 */

import type { Adapter } from '../ports/adapter.js'
import type { StructuralPosition } from '../core/schema.js'
import { verseKey } from './shared.js'

/** Al-Quran Cloud API base (text, audio, translation). */
const ALQURAN_CLOUD_BASE = 'https://api.alquran.cloud/v1'

/** The default recitation edition used when the caller names no reciter. */
const DEFAULT_RECITER = 'ar.alafasy'

/** The default translation edition used when the caller names none. */
const DEFAULT_TRANSLATION = 'en.sahih'

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

/** The subset of Al-Quran Cloud's translation-edition response the translation transform reads. */
interface AqcTranslationResponse {
  readonly data: {
    readonly text: string
    readonly numberInSurah: number
    readonly surah: { readonly number: number }
    readonly edition?: { readonly identifier?: string; readonly language?: string }
  }
}

/**
 * Computes a verse's structural position purely from its (chapter, verse). This is a
 * placeholder identity mapping until the real Quran structure registry (v0.3 backlog item 5)
 * ships; every built-in text/audio/exegesis adapter uses it so structure is consistent across
 * providers today and swaps to real data in one place later.
 */
function placeholderStructure(): StructuralPosition {
  return { part: 1, group: 1, quarter: 1 }
}

/** Al-Quran Cloud (`alquran_cloud`) — verse text, ayah audio, and translations, keyless. */
export const alquranCloud: Adapter = {
  id: 'alquran_cloud',
  name: 'Al-Quran Cloud',
  homepage: 'https://alquran.cloud',
  capabilities: ['text', 'audio', 'translation'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${ALQURAN_CLOUD_BASE}/ayah/${verseKey(q.chapter, q.verse)}`,
    transform: (raw) => {
      const { data } = raw as AqcAyahResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number,
        verse: data.numberInSurah,
        text: data.text.trim(),
        structure: placeholderStructure(),
        ...(data.page != null ? { meta: { page: data.page } } : {}),
      }
    },
  },
  audio: {
    buildUrl: (q) =>
      `${ALQURAN_CLOUD_BASE}/ayah/${verseKey(q.chapter, q.verse)}/${q.reciter ?? DEFAULT_RECITER}`,
    transform: (raw, q) => {
      const { data } = raw as AqcAudioResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number,
        verse: data.numberInSurah,
        scope: 'verse',
        reciter: data.edition?.identifier ?? q.reciter ?? DEFAULT_RECITER,
        url: data.audio,
        format: 'mp3',
      }
    },
  },
  translation: {
    buildUrl: (q) =>
      `${ALQURAN_CLOUD_BASE}/ayah/${verseKey(q.chapter, q.verse)}/${q.edition ?? DEFAULT_TRANSLATION}`,
    transform: (raw, q) => {
      const { data } = raw as AqcTranslationResponse
      return {
        key: verseKey(data.surah.number, data.numberInSurah),
        chapter: data.surah.number,
        verse: data.numberInSurah,
        edition: data.edition?.identifier ?? q.edition ?? DEFAULT_TRANSLATION,
        language: data.edition?.language ?? 'en',
        text: data.text.trim(),
      }
    },
  },
}
