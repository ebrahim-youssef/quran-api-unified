/**
 * Quran API (Edge) adapter — a fast static edge API returning text (and audio) for an ayah in
 * one JSON file. Keyless. See `docs/providers/quran-api-edge.md`. Declarative and pure.
 */

import type { Adapter } from '../ports/adapter.js'
import type { StructuralPosition } from '../core/schema.js'
import { verseKey } from './shared.js'

/** Quran API (Edge) base — one JSON file per ayah carries text + audio. */
const QURAN_API_EDGE_BASE = 'https://quranapi.pages.dev/api'

/** One reciter entry in the Edge `audio` map. */
interface EdgeAudioEntry {
  readonly reciter: string
  readonly url: string
  readonly originalUrl?: string
}

/** The subset of the Edge ayah file the text and audio transforms read. */
interface EdgeAyahResponse {
  readonly surahNo: number
  readonly ayahNo: number
  readonly arabic1: string
  readonly arabic2?: string
  readonly english?: string
  readonly surahNameArabic?: string
  readonly audio?: Readonly<Record<string, EdgeAudioEntry>>
}

/** Picks the requested reciter id from the audio map, else the first entry. */
function pickAudio(
  audio: Readonly<Record<string, EdgeAudioEntry>>,
  reciter?: string,
): { id: string; entry: EdgeAudioEntry } | undefined {
  if (reciter != null && audio[reciter]) return { id: reciter, entry: audio[reciter] }
  const first = Object.keys(audio)[0]
  return first == null ? undefined : { id: first, entry: audio[first] as EdgeAudioEntry }
}

/** See `alquran-cloud.ts` for why this is a placeholder pending the structure registry. */
function placeholderStructure(): StructuralPosition {
  return { part: 1, group: 1, quarter: 1 }
}

/** Quran API Edge (`quran_api_edge`) — verse text and ayah audio via `GET /{chapter}/{verse}.json`. */
export const quranApiEdge: Adapter = {
  id: 'quran_api_edge',
  name: 'Quran API (Edge)',
  homepage: 'https://quranapi.pages.dev',
  capabilities: ['text', 'audio'],
  auth: 'none',
  text: {
    buildUrl: (q) => `${QURAN_API_EDGE_BASE}/${q.chapter}/${q.verse ?? 1}.json`,
    transform: (raw) => {
      const r = raw as EdgeAyahResponse
      return {
        key: verseKey(r.surahNo, r.ayahNo),
        chapter: r.surahNo,
        verse: r.ayahNo,
        text: r.arabic1,
        structure: placeholderStructure(),
      }
    },
  },
  audio: {
    buildUrl: (q) => `${QURAN_API_EDGE_BASE}/${q.chapter}/${q.verse ?? 1}.json`,
    transform: (raw, q) => {
      const r = raw as EdgeAyahResponse
      const picked = pickAudio(r.audio ?? {}, q.reciter)
      return {
        key: verseKey(r.surahNo, r.ayahNo),
        chapter: r.surahNo,
        verse: r.ayahNo,
        scope: 'verse',
        reciter: picked?.entry.reciter ?? q.reciter ?? 'unknown',
        url: picked?.entry.url ?? '',
        format: 'mp3',
      }
    },
  },
}
