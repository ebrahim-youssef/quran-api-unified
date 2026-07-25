/**
 * Quran Foundation adapter — the official Quran.com v4 API, behind OAuth2 client credentials.
 * See `docs/providers/quran-foundation.md`. Declarative and pure: the client exchanges the
 * caller's `clientId`/`secret` for an access token and injects it as `ctx.accessToken`; this
 * adapter only describes the request and maps the response.
 *
 * Without credentials it is skipped in auto-selection, and throws only if named explicitly
 * (ADR-0005). Keyless callers still get text from the other built-in providers.
 */

import type { Adapter } from '../ports/adapter.js'
import { parseVerseKey, verseKey } from './shared.js'

/** Quran Foundation official content API base (v4), behind OAuth2. */
const QURAN_FOUNDATION_CONTENT_BASE = 'https://apis.quran.foundation/content/api/v4'

/** Quran Foundation OAuth2 token endpoint (client-credentials grant). */
const QURAN_FOUNDATION_TOKEN_URL = 'https://oauth2.quran.foundation/oauth2/token'

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
      `${QURAN_FOUNDATION_CONTENT_BASE}/quran/verses/uthmani?verse_key=${verseKey(q.surah, q.ayah)}`,
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
      const { surah, ayah } = parseVerseKey(verse.verse_key)
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
