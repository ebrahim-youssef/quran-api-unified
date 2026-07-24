import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { select } from './select.js'
import { makeAdapter } from '../../test/helpers/fakes.js'

const noCreds = () => false
const allCreds = () => true

describe('select — auto mode', () => {
  it('returns capable adapters in registration order', () => {
    const adapters = [
      makeAdapter('a', ['text']),
      makeAdapter('b', ['audio']),
      makeAdapter('c', ['text']),
    ]
    const res = select({ capability: 'text', adapters, hasCredentials: noCreds })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.map((a) => a.id)).toEqual(['a', 'c'])
  })

  it('skips a credentialed adapter when its credentials are absent', () => {
    const adapters = [makeAdapter('keyed', ['text'], 'apiKey'), makeAdapter('free', ['text'])]
    const res = select({ capability: 'text', adapters, hasCredentials: noCreds })
    expect(res.ok && res.value.map((a) => a.id)).toEqual(['free'])
  })

  it('includes a credentialed adapter once its credentials are present', () => {
    const adapters = [makeAdapter('keyed', ['text'], 'apiKey')]
    const res = select({ capability: 'text', adapters, hasCredentials: allCreds })
    expect(res.ok && res.value.map((a) => a.id)).toEqual(['keyed'])
  })

  it('returns an empty list (not an error) when no adapter serves the concern', () => {
    const res = select({
      capability: 'tafsir',
      adapters: [makeAdapter('a', ['text'])],
      hasCredentials: noCreds,
    })
    expect(res).toEqual({ ok: true, value: [] })
  })
})

describe('select — explicit source (misuse is data the client throws)', () => {
  const adapters = [
    makeAdapter('a', ['text']),
    makeAdapter('b', ['text']),
    makeAdapter('keyed', ['text'], 'apiKey'),
  ]

  it('honors a named primary + its own ordered fallback, de-duplicated', () => {
    const res = select({
      capability: 'text',
      adapters,
      source: { id: 'a', fallback: ['b', 'a'] },
      hasCredentials: noCreds,
    })
    expect(res.ok && res.value.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('errors adapter_not_found for an unknown id', () => {
    const res = select({
      capability: 'text',
      adapters,
      source: { id: 'nope' },
      hasCredentials: noCreds,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('adapter_not_found')
  })

  it('errors unsupported_capability when the named adapter does not serve the concern', () => {
    const res = select({
      capability: 'audio',
      adapters,
      source: { id: 'a' },
      hasCredentials: noCreds,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('unsupported_capability')
  })

  it('errors credentials_required when a named adapter lacks its credentials', () => {
    const res = select({
      capability: 'text',
      adapters,
      source: { id: 'keyed' },
      hasCredentials: noCreds,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('credentials_required')
  })
})

describe('select — properties', () => {
  it('auto candidates are a stable, order-preserving subset of the registry', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.string({ minLength: 1 }), text: fc.boolean() }), {
          maxLength: 8,
        }),
        (specs) => {
          // unique ids
          const seen = new Set<string>()
          const unique = specs.filter((s) => !seen.has(s.id) && seen.add(s.id))
          const adapters = unique.map((s) => makeAdapter(s.id, s.text ? ['text'] : ['audio']))
          const res = select({ capability: 'text', adapters, hasCredentials: () => false })
          if (!res.ok) return false
          const ids = res.value.map((a) => a.id)
          const expected = unique.filter((s) => s.text).map((s) => s.id)
          return JSON.stringify(ids) === JSON.stringify(expected)
        },
      ),
    )
  })
})
