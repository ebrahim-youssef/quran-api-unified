import { describe, expect, expectTypeOf, it } from 'vitest'
import { createError } from './errors.js'
import { errOutcome, okOutcome, type Attempt, type GetResult, type Outcome } from './result.js'
import type { Provenance } from './identity.js'
import type { UnifiedVerse } from './schema.js'

const attempts: readonly Attempt[] = [{ adapterId: 'alquran_cloud', ok: true, durationMs: 12 }]
const provenance: Provenance = {
  provider: { id: 'alquran_cloud', name: 'Al-Quran Cloud' },
  sourceUrl: 'https://api.alquran.cloud/v1/ayah/1:1',
  retrievedAt: '2026-08-07T00:00:00.000Z',
}

describe('okOutcome', () => {
  it('builds a successful Outcome with schemaVersion + provenance + attempts', () => {
    const outcome = okOutcome('hello', attempts, provenance)
    expect(outcome).toEqual({
      ok: true,
      schemaVersion: '0.3.0',
      value: 'hello',
      attempts,
      provenance,
    })
    expect(outcome.error).toBeUndefined()
  })

  it('omits provenance and raw when not given', () => {
    const outcome = okOutcome('hello', attempts)
    expect(outcome.provenance).toBeUndefined()
    expect(outcome.raw).toBeUndefined()
  })
})

describe('errOutcome', () => {
  it('builds a failed Outcome carrying schemaVersion + the error, no provenance', () => {
    const error = createError('all_failed', 'every provider failed')
    const failed: readonly Attempt[] = [{ adapterId: 'alquran_cloud', ok: false, error }]
    const outcome = errOutcome<string>(error, failed)
    expect(outcome).toEqual({ ok: false, schemaVersion: '0.3.0', error, attempts: failed })
    expect(outcome.value).toBeUndefined()
    expect(outcome.provenance).toBeUndefined()
  })
})

describe('GetResult contract', () => {
  it('discriminates ok:true → value / ok:false → error, both carrying schemaVersion', () => {
    const verse: UnifiedVerse = {
      key: '1:1',
      chapter: 1,
      verse: 1,
      text: 'بسم الله الرحمن الرحيم',
      structure: { part: 1, group: 1, quarter: 1 },
    }
    const ok: GetResult = {
      ok: true,
      schemaVersion: '0.3.0',
      value: { ref: { chapter: 1, verse: 1 }, text: okOutcome(verse, attempts, provenance) },
      attempts,
    }

    if (ok.ok) {
      expect(ok.schemaVersion).toBe('0.3.0')
      expectTypeOf(ok.value.text).toEqualTypeOf<Outcome<UnifiedVerse> | undefined>()
      expect(ok.value.text?.value?.text).toContain('بسم')
    }
  })
})
