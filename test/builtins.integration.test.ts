import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createQuranClient } from '../src/client.js'
import type { Behavior } from './helpers/fakes.js'

/** Loads and parses a JSON fixture (real recorded provider response). */
function json(path: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${path}`, import.meta.url)), 'utf8'),
  )
}

// The real URLs the built-in text adapters build for surah 1, ayah 1.
const AQC = 'https://api.alquran.cloud/v1/ayah/1:1'
const EDGE = 'https://quranapi.pages.dev/api/1/1.json'

function fetchWith(routes: Record<string, Behavior>): typeof globalThis.fetch {
  return ((input: string | URL | Request) => {
    const u = typeof input === 'string' ? input : input.toString()
    const b = routes[u] ?? { kind: 'http' as const, status: 404 }
    if (b.kind === 'network') return Promise.reject(new Error('net'))
    if (b.kind === 'http') return Promise.resolve(new Response('e', { status: b.status }))
    return Promise.resolve(new Response(JSON.stringify(b.body), { status: 200 }))
  }) as unknown as typeof globalThis.fetch
}

describe('built-in registry — real adapters, fixture-routed fetch', () => {
  it('serves text from the primary provider (Al-Quran Cloud) via the default registry', async () => {
    const client = createQuranClient({
      fetch: fetchWith({ [AQC]: { kind: 'ok', body: json('alquran_cloud/text-1-1.json') } }),
    })
    const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      // Part.source is the adapter id; the display name rides the unified value.
      expect(res.value.text?.source).toBe('alquran_cloud')
      expect(res.value.text?.value?.source).toBe('Al-Quran Cloud')
      expect(res.value.text?.value?.key).toBe('1:1')
    }
  })

  it('falls back to the next built-in when the primary fails', async () => {
    const client = createQuranClient({
      fetch: fetchWith({
        [AQC]: { kind: 'http', status: 500 },
        [EDGE]: { kind: 'ok', body: json('quran_api_edge/text-1-1.json') },
      }),
    })
    const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.text?.source).toBe('quran_api_edge')
      expect(res.value.text?.value?.source).toBe('Quran API (Edge)')
      // The failed primary is recorded ahead of the successful fallback.
      expect(res.value.text?.attempts[0]).toMatchObject({ adapterId: 'alquran_cloud', ok: false })
    }
  })

  it('lists the built-in text providers in preference order', () => {
    const client = createQuranClient({ fetch: fetchWith({}) })
    expect(client.listAdapters('text').map((a) => a.id)).toEqual([
      'alquran_cloud',
      'quran_api_edge',
      'quran_hub',
      'quran_finder',
      'quran_foundation',
    ])
  })
})
