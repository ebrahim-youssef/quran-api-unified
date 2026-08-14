import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { compose, type AttemptOutcome } from './compose.js'
import { createError } from './errors.js'
import type { UnifiedVerse } from './schema.js'
import type { Adapter } from '../ports/adapter.js'
import { makeAdapter } from '../../test/helpers/fakes.js'

const verse = (): UnifiedVerse => ({
  key: '1:1',
  chapter: 1,
  verse: 1,
  text: 't',
  structure: { part: 1, group: 1, quarter: 1 },
})

/** Builds an `attempt` closure that succeeds for the listed ids and fails for the rest. */
function attemptWhere(okIds: readonly string[]) {
  return (adapter: Adapter): Promise<AttemptOutcome<UnifiedVerse>> =>
    Promise.resolve(
      okIds.includes(adapter.id)
        ? {
            result: { ok: true, value: verse() },
            durationMs: 1,
            provenance: { provider: { id: adapter.id, name: adapter.id }, retrievedAt: 'now' },
          }
        : {
            result: {
              ok: false,
              error: createError('provider_http', `fail ${adapter.id}`, { status: 500 }),
            },
          },
    )
}

const textAdapters = (...ids: string[]) => ids.map((id) => makeAdapter(id, ['text']))

describe('compose — fallback chain', () => {
  it('falls back past a failing provider to the next and records both attempts', async () => {
    const res = await compose({
      ref: { chapter: 1, verse: 1 },
      text: {
        candidates: textAdapters('a', 'b'),
        query: { chapter: 1, verse: 1 },
        attempt: attemptWhere(['b']),
      },
    })
    expect(res.text?.ok).toBe(true)
    expect(res.text?.provenance?.provider.id).toBe('b')
    expect(res.text?.attempts.map((x) => [x.adapterId, x.ok])).toEqual([
      ['a', false],
      ['b', true],
    ])
  })

  it('marks the outcome failed with all_failed when every provider fails', async () => {
    const res = await compose({
      ref: { chapter: 1, verse: 1 },
      text: {
        candidates: textAdapters('a', 'b'),
        query: { chapter: 1, verse: 1 },
        attempt: attemptWhere([]),
      },
    })
    expect(res.text?.ok).toBe(false)
    expect(res.text?.error?.code).toBe('all_failed')
    expect(res.text?.attempts).toHaveLength(2)
  })

  it('marks the outcome failed with all_failed when there are no candidates', async () => {
    const res = await compose({
      ref: { chapter: 1, verse: 1 },
      text: { candidates: [], query: { chapter: 1, verse: 1 }, attempt: attemptWhere([]) },
    })
    expect(res.text?.ok).toBe(false)
    expect(res.text?.error?.code).toBe('all_failed')
    expect(res.text?.attempts).toHaveLength(0)
  })
})

describe('compose — partial results', () => {
  it('a failed concern does not fail a sibling concern', async () => {
    const res = await compose({
      ref: { chapter: 1, verse: 1 },
      text: {
        candidates: textAdapters('a'),
        query: { chapter: 1, verse: 1 },
        attempt: attemptWhere(['a']),
      },
      audio: {
        candidates: [makeAdapter('x', ['audio'])],
        query: { chapter: 1, verse: 1 },
        attempt: () =>
          Promise.resolve({
            result: { ok: false, error: createError('provider_timeout', 'slow') },
          }),
      },
    })
    expect(res.text?.ok).toBe(true)
    expect(res.audio?.ok).toBe(false)
    expect(res.ref).toEqual({ chapter: 1, verse: 1 })
  })

  it('omits concerns that were not requested', async () => {
    const res = await compose({
      ref: { chapter: 1, verse: 1 },
      text: {
        candidates: textAdapters('a'),
        query: { chapter: 1, verse: 1 },
        attempt: attemptWhere(['a']),
      },
    })
    expect(res.audio).toBeUndefined()
    expect(res.translation).toBeUndefined()
    expect(res.exegesis).toBeUndefined()
  })
})

describe('compose — property: first success wins', () => {
  it('picks the first ok candidate; fails only when none succeed', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }), async (pattern) => {
        const ids = pattern.map((_, i) => `p${i}`)
        const okIds = ids.filter((_, i) => pattern[i])
        const res = await compose({
          ref: { chapter: 1, verse: 1 },
          text: {
            candidates: textAdapters(...ids),
            query: { chapter: 1, verse: 1 },
            attempt: attemptWhere(okIds),
          },
        })
        const firstOk = pattern.findIndex((b) => b)
        if (firstOk === -1)
          return res.text?.ok === false && res.text?.attempts.length === ids.length
        return (
          res.text?.ok === true &&
          res.text.provenance?.provider.id === `p${firstOk}` &&
          res.text.attempts.length === firstOk + 1
        )
      }),
    )
  })
})
