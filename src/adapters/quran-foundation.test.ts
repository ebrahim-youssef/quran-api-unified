import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { quranFoundation } from './quran-foundation.js'
import type { AdapterContext, CapabilityHandler } from '../ports/adapter.js'
import type { UnifiedVerse, VerseQuery } from '../core/schema.js'

const q: VerseQuery = { surah: 1, ayah: 1 }
const handler = quranFoundation.text as CapabilityHandler<VerseQuery, UnifiedVerse>

function fixture(path: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../test/fixtures/${path}`, import.meta.url)), 'utf8'),
  )
}

describe('quran_foundation', () => {
  it('declares OAuth2 client-credentials auth with a token URL', () => {
    expect(quranFoundation.auth).toBe('oauth2-client')
    expect(quranFoundation.oauth2?.tokenUrl).toMatch(/^https:\/\//)
  })

  it('builds the verses URL', () => {
    expect(handler.buildUrl(q, {})).toBe(
      'https://apis.quran.foundation/content/api/v4/quran/verses/uthmani?verse_key=1:1',
    )
  })

  it('attaches the access token and client id as headers', () => {
    const ctx: AdapterContext = { accessToken: 'tok-123', credentials: { clientId: 'cid' } }
    expect(handler.headers?.(ctx)).toEqual({ 'x-auth-token': 'tok-123', 'x-client-id': 'cid' })
    // No token yet → no auth header.
    expect(handler.headers?.({})).toEqual({})
  })

  it('maps the fixture (first element of verses) to a UnifiedVerse', () => {
    const v = handler.transform(fixture('quran_foundation/text-1-1.json'), q, {})
    expect(v.key).toBe('1:1')
    expect(v.surah).toBe(1)
    expect(v.ayah).toBe(1)
    expect(v.source).toBe('Quran Foundation')
    expect(v.text.length).toBeGreaterThan(5)
  })
})
