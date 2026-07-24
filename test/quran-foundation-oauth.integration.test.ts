import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createQuranClient } from '../src/client.js'
import { quranFoundation } from '../src/adapters/quran-foundation.js'

const TOKEN_URL = 'https://oauth2.quran.foundation/oauth2/token'
const CONTENT_URL =
  'https://apis.quran.foundation/content/api/v4/quran/verses/uthmani?verse_key=1:1'

function versesFixture(): unknown {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./fixtures/quran_foundation/text-1-1.json', import.meta.url)),
      'utf8',
    ),
  )
}

/** A fake fetch that answers the token endpoint (POST) and the content endpoint, tracking calls. */
function oauthFetch(): typeof globalThis.fetch & { tokenCalls: number } {
  let tokenCalls = 0
  const impl = (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url === TOKEN_URL) {
      tokenCalls += 1
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: 'tok-abc', expires_in: 3600 }), {
          status: 200,
        }),
      )
    }
    if (url === CONTENT_URL) {
      return Promise.resolve(new Response(JSON.stringify(versesFixture()), { status: 200 }))
    }
    return Promise.resolve(new Response('not found', { status: 404 }))
  }
  const fn = impl as unknown as typeof globalThis.fetch & { tokenCalls: number }
  Object.defineProperty(fn, 'tokenCalls', { get: () => tokenCalls })
  return fn
}

const creds = { quran_foundation: { clientId: 'cid', secret: 'sec' } }

describe('quran_foundation OAuth2 client-credentials flow (#12)', () => {
  it('exchanges credentials for a token, then serves the content', async () => {
    const fetch = oauthFetch()
    const client = createQuranClient({
      useBuiltins: false,
      adapters: [quranFoundation],
      credentials: creds,
      fetch,
    })
    const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.text?.source).toBe('quran_foundation')
      expect(res.value.text?.value?.source).toBe('Quran Foundation')
    }
    expect(fetch.tokenCalls).toBe(1)
  })

  it('caches the token across calls (one exchange for two gets)', async () => {
    const fetch = oauthFetch()
    const client = createQuranClient({
      useBuiltins: false,
      adapters: [quranFoundation],
      credentials: creds,
      fetch,
    })
    await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
    await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
    expect(fetch.tokenCalls).toBe(1)
  })

  it('is skipped in auto-selection when credentials are absent', async () => {
    const client = createQuranClient({
      useBuiltins: false,
      adapters: [quranFoundation],
      fetch: oauthFetch(),
    })
    const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
    // No candidates → nothing served.
    expect(res.ok).toBe(false)
  })

  it('throws credentials_required when named explicitly without credentials', async () => {
    const client = createQuranClient({
      useBuiltins: false,
      adapters: [quranFoundation],
      fetch: oauthFetch(),
    })
    await expect(
      client.get({
        ref: { surah: 1, ayah: 1 },
        include: ['text'],
        source: { text: { id: 'quran_foundation' } },
      }),
    ).rejects.toThrowError(/credentials/i)
  })
})
