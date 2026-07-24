import { describe, expect, it } from 'vitest'
import { createQuranClient } from './client.js'
import { makeAdapter, makeFetch, url } from '../test/helpers/fakes.js'

const ref = { surah: 1, ayah: 1 }

describe('createQuranClient — construction', () => {
  it('throws a configuration error (misuse) when no usable fetch is available', () => {
    expect(() => createQuranClient({ fetch: 123 as never })).toThrowError(/fetch/i)
  })

  it('exposes get, listAdapters, and registerAdapter', () => {
    const client = createQuranClient({ fetch: makeFetch({}) })
    expect(typeof client.get).toBe('function')
    expect(typeof client.listAdapters).toBe('function')
    expect(typeof client.registerAdapter).toBe('function')
  })

  it('listAdapters filters by capability', () => {
    const client = createQuranClient({
      fetch: makeFetch({}),
      adapters: [makeAdapter('t', ['text']), makeAdapter('a', ['audio'])],
    })
    expect(client.listAdapters('text').map((x) => x.id)).toEqual(['t'])
    expect(client.listAdapters().map((x) => x.id)).toEqual(['t', 'a'])
  })
})

describe('get — composition and fallback', () => {
  it('composes a requested concern from a working provider', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('a', 'text')]: { kind: 'ok', body: { text: 'بسم الله' } } }),
      adapters: [makeAdapter('a', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.text?.ok).toBe(true)
      expect(res.value.text?.value?.text).toBe('بسم الله')
      expect(res.value.text?.source).toBe('a')
    }
  })

  it('falls back to the next provider when the first returns an HTTP error', async () => {
    const client = createQuranClient({
      fetch: makeFetch({
        [url('a', 'text')]: { kind: 'http', status: 500 },
        [url('b', 'text')]: { kind: 'ok', body: { text: 'from b' } },
      }),
      adapters: [makeAdapter('a', ['text']), makeAdapter('b', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.text?.source).toBe('b')
      expect(res.value.text?.attempts.map((x) => x.ok)).toEqual([false, true])
    }
  })

  it('returns partial results: one concern succeeds while another fails', async () => {
    const client = createQuranClient({
      fetch: makeFetch({
        [url('a', 'text')]: { kind: 'ok', body: { text: 'ok text' } },
        [url('a', 'audio')]: { kind: 'network' },
      }),
      adapters: [makeAdapter('a', ['text', 'audio'])],
    })
    const res = await client.get({ ref, include: ['text', 'audio'] })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.text?.ok).toBe(true)
      expect(res.value.audio?.ok).toBe(false)
      // The concern-level error is the aggregate; the specific cause is in the attempt trail.
      expect(res.value.audio?.error?.code).toBe('all_failed')
      expect(res.value.audio?.attempts[0]?.error?.code).toBe('provider_network')
    }
  })

  it('reports ok:false with all_failed when no concern can be served', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('a', 'text')]: { kind: 'http', status: 503 } }),
      adapters: [makeAdapter('a', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('all_failed')
      expect(res.attempts).toHaveLength(1)
    }
  })

  it('throws configuration misuse when include is empty', async () => {
    const client = createQuranClient({ fetch: makeFetch({}) })
    await expect(client.get({ ref, include: [] })).rejects.toThrowError(/at least one concern/i)
  })
})

describe('get — raw passthrough (ADR-0010)', () => {
  const body = { text: 'raw text', number: 42 }

  it('omits Part.raw by default', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('a', 'text')]: { kind: 'ok', body } }),
      adapters: [makeAdapter('a', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok && res.value.text?.raw).toBeUndefined()
  })

  it('attaches the original provider body on Part.raw when includeRaw is true', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('a', 'text')]: { kind: 'ok', body } }),
      adapters: [makeAdapter('a', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'], includeRaw: true })
    expect(res.ok).toBe(true)
    if (res.ok) {
      // Unified value and raw body sit side by side.
      expect(res.value.text?.value?.text).toBe('raw text')
      expect(res.value.text?.raw).toEqual(body)
    }
  })

  it('does not attach raw to a failed concern', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('a', 'text')]: { kind: 'http', status: 500 } }),
      adapters: [makeAdapter('a', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'], includeRaw: true })
    expect(res.ok).toBe(false)
  })
})

describe('get — custom + credentialed adapters', () => {
  it('registerAdapter makes a custom adapter selectable, including in the fallback chain', async () => {
    const client = createQuranClient({
      fetch: makeFetch({
        [url('builtinish', 'text')]: { kind: 'http', status: 500 },
        [url('custom', 'text')]: { kind: 'ok', body: { text: 'from custom' } },
      }),
      adapters: [makeAdapter('builtinish', ['text'])],
    })
    client.registerAdapter(makeAdapter('custom', ['text']))
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok && res.value.text?.source).toBe('custom')
  })

  it('registerAdapter returns the client for chaining', () => {
    const client = createQuranClient({ fetch: makeFetch({}) })
    expect(client.registerAdapter(makeAdapter('x', ['text']))).toBe(client)
  })

  it('skips a credentialed adapter in auto-selection when creds are absent', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('free', 'text')]: { kind: 'ok', body: { text: 'free' } } }),
      adapters: [makeAdapter('keyed', ['text'], 'apiKey'), makeAdapter('free', ['text'])],
    })
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok && res.value.text?.source).toBe('free')
    // The credentialed provider was never selected, so it never appears in the attempt trail.
    const triedIds = res.ok ? res.value.text?.attempts.map((a) => a.adapterId) : []
    expect(triedIds).toEqual(['free'])
  })

  it('uses a credentialed adapter once its credentials are supplied', async () => {
    const client = createQuranClient({
      fetch: makeFetch({ [url('keyed', 'text')]: { kind: 'ok', body: { text: 'keyed' } } }),
      adapters: [makeAdapter('keyed', ['text'], 'apiKey')],
      credentials: { keyed: { apiKey: 'secret' } },
    })
    const res = await client.get({ ref, include: ['text'] })
    expect(res.ok && res.value.text?.value?.text).toBe('keyed')
  })

  it('throws adapter_not_found (misuse) for an explicitly named unknown source', async () => {
    const client = createQuranClient({
      fetch: makeFetch({}),
      adapters: [makeAdapter('a', ['text'])],
    })
    await expect(
      client.get({ ref, include: ['text'], source: { text: { id: 'ghost' } } }),
    ).rejects.toThrowError(/ghost/)
  })
})
