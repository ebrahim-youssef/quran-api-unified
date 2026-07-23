import { describe, expect, it } from 'vitest'
import { createError, throwQuranError, type QuranError, type ThrownQuranError } from './errors.js'

describe('createError', () => {
  it('builds a bare error from code + message', () => {
    const err = createError('provider_timeout', 'timed out')
    expect(err).toEqual({ code: 'provider_timeout', message: 'timed out' })
  })

  it('merges the optional fields onto the value', () => {
    const cause = new Error('boom')
    const err = createError('provider_http', 'bad gateway', {
      adapterId: 'alquran_cloud',
      status: 502,
      cause,
    })
    expect(err).toEqual({
      code: 'provider_http',
      message: 'bad gateway',
      adapterId: 'alquran_cloud',
      status: 502,
      cause,
    })
  })
})

describe('throwQuranError', () => {
  it('throws a real Error carrying the QuranError on .detail', () => {
    const detail: QuranError = createError('adapter_not_found', 'no such adapter: nope', {
      adapterId: 'nope',
    })

    let caught: unknown
    try {
      throwQuranError(detail)
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(Error)
    const thrown = caught as ThrownQuranError
    expect(thrown.message).toBe('no such adapter: nope')
    expect(thrown.name).toBe('QuranError:adapter_not_found')
    expect(thrown.detail).toBe(detail)
  })

  it('has a never return type usable in exhaustive branches', () => {
    // Compile-time proof: the never return lets throwQuranError stand in for an
    // unreachable branch without TS complaining about a missing return.
    const pick = (): number => {
      const code = 'configuration' as QuranError['code']
      if (code === 'configuration') return 1
      return throwQuranError(createError('configuration', 'unreachable'))
    }
    expect(pick()).toBe(1)
  })
})
