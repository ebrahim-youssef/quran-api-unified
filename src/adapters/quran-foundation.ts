/**
 * Quran Foundation adapter — the official Quran.com v4 API, behind OAuth2 client credentials.
 * See `docs/providers/quran-foundation.md`. Declarative and pure: the client exchanges the
 * caller's `clientId`/`secret` for an access token and injects it as `ctx.accessToken`; this
 * adapter only describes the request and maps the response.
 *
 * Without credentials it is skipped in auto-selection, and throws only if named explicitly
 * (ADR-0005). Keyless callers still get text from the other built-in providers.
 */

import { QURAN_FOUNDATION_CONTENT_BASE, QURAN_FOUNDATION_TOKEN_URL } from '../core/constants.js'
import type { Adapter } from '../ports/adapter.js'

/** The subset of the Quran Foundation verses response the text transform reads. */
interface QfVersesResponse {
  readonly verses: readonly {
    readonly id?: number
    readonly verse_key: string
    readonly text_uthmani: string
    readonly juz_number?: number
    readonly page_number?: number
  }[]
}

/** Splits a `"surah:ayah"` verse key into its numbers. */
function splitKey(key: string): { surah: number; ayah: number } {
  const [surah, ayah] = key.split(':').map(Number)
  return { surah: surah ?? 0, ayah: ayah ?? 0 }
}

/** Quran Foundation (`quran_foundation`) — Uthmani verse text, OAuth2 client-credentials. */
export const quranFoundation: Adapter = {
  id: 'quran_foundation',
  name: 'Quran Foundation',
  homepage: 'https://quran.com',
  capabilities: ['text'],
  auth: 'oauth2-client',
  oauth2: { tokenUrl: QURAN_FOUNDATION_TOKEN_URL, scope: 'content' },
  text: {
    buildUrl: (q) =>
      `${QURAN_FOUNDATION_CONTENT_BASE}/quran/verses/uthmani?verse_key=${q.surah}:${q.ayah ?? 1}`,
    headers: (ctx) => {
      const headers: Record<string, string> = {}
      if (ctx.accessToken) headers['x-auth-token'] = ctx.accessToken
      const clientId = ctx.credentials?.clientId
      if (clientId) headers['x-client-id'] = clientId
      return headers
    },
    transform: (raw) => {
      const verse = (raw as QfVersesResponse).verses[0]
      if (!verse) throw new Error('Quran Foundation response had no verses')
      const { surah, ayah } = splitKey(verse.verse_key)
      return {
        key: verse.verse_key,
        surah,
        ayah,
        source: 'Quran Foundation',
        text: verse.text_uthmani,
        meta: { id: verse.id, juz: verse.juz_number, page: verse.page_number },
      }
    },
  },
}
