import { describe, expect, it, vi } from 'vitest'
import { httpFetch, type FetchLike, type HttpDeps } from './http.js'

const deps = (fetchImpl: FetchLike, timeoutMs = 10_000): HttpDeps => ({ fetchImpl, timeoutMs })

/** A fake `fetch` returning a canned Response; records the URL/init it was called with. */
function fakeFetch(response: Response): {
  fetchImpl: FetchLike
  calls: { url: string; init?: RequestInit }[]
} {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return Promise.resolve(response)
  }) as unknown as FetchLike
  return { fetchImpl, calls }
}

describe('httpFetch', () => {
  it('parses a JSON body on success', async () => {
    const { fetchImpl } = fakeFetch(
      new Response(JSON.stringify({ hello: 'world' }), { status: 200 }),
    )
    const res = await httpFetch('https://api.test/x', deps(fetchImpl))
    expect(res).toEqual({ ok: true, value: { hello: 'world' } })
  })

  it('reads a text body when responseType is text', async () => {
    const { fetchImpl } = fakeFetch(new Response('بسم الله', { status: 200 }))
    const res = await httpFetch('https://api.test/x', deps(fetchImpl), { responseType: 'text' })
    expect(res).toEqual({ ok: true, value: 'بسم الله' })
  })

  it('forwards headers to the underlying fetch', async () => {
    const { fetchImpl, calls } = fakeFetch(new Response('{}', { status: 200 }))
    await httpFetch('https://api.test/x', deps(fetchImpl), {
      headers: { authorization: 'Bearer t' },
    })
    expect(calls[0]?.init?.headers).toEqual({ authorization: 'Bearer t' })
  })

  it('maps a non-2xx status to a provider_http error carrying the status', async () => {
    const { fetchImpl } = fakeFetch(new Response('nope', { status: 503 }))
    const res = await httpFetch('https://api.test/x', deps(fetchImpl))
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('provider_http')
      expect(res.error.status).toBe(503)
    }
  })

  it('maps a rejected fetch to a provider_network error', async () => {
    const boom = new Error('connection reset')
    const fetchImpl = (() => Promise.reject(boom)) as unknown as FetchLike
    const res = await httpFetch('https://api.test/x', deps(fetchImpl))
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('provider_network')
      expect(res.error.cause).toBe(boom)
    }
  })

  it('maps an aborted (timed-out) request to a provider_timeout error', async () => {
    // fetch that rejects only once its signal aborts — i.e. a request slower than the timeout.
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as unknown as FetchLike
    const res = await httpFetch('https://api.test/slow', deps(fetchImpl, 5))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('provider_timeout')
  })

  it('maps an unparseable JSON body to a provider_parse error', async () => {
    const { fetchImpl } = fakeFetch(new Response('not json', { status: 200 }))
    const res = await httpFetch('https://api.test/x', deps(fetchImpl))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('provider_parse')
  })

  it('clears its timeout timer so a fast success leaves nothing pending', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { fetchImpl } = fakeFetch(new Response('{}', { status: 200 }))
    await httpFetch('https://api.test/x', deps(fetchImpl))
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
