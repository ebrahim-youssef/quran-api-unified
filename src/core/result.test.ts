import { describe, expect, expectTypeOf, it } from 'vitest'
import { createError } from './errors.js'
import { errPart, okPart, type Attempt, type GetResult, type Part } from './result.js'
import type { UnifiedVerse } from './schema.js'

const attempts: readonly Attempt[] = [{ adapterId: 'alquran_cloud', ok: true, durationMs: 12 }]

describe('okPart', () => {
  it('builds a successful Part with source + attempts', () => {
    const part = okPart('hello', 'alquran_cloud', attempts)
    expect(part).toEqual({ ok: true, value: 'hello', source: 'alquran_cloud', attempts })
    expect(part.error).toBeUndefined()
  })
})

describe('errPart', () => {
  it('builds a failed Part carrying the error, no source', () => {
    const error = createError('all_failed', 'every provider failed')
    const failed: readonly Attempt[] = [{ adapterId: 'alquran_cloud', ok: false, error }]
    const part = errPart<string>(error, failed)
    expect(part).toEqual({ ok: false, error, attempts: failed })
    expect(part.value).toBeUndefined()
    expect(part.source).toBeUndefined()
  })
})

describe('GetResult contract', () => {
  it('discriminates ok:true → value / ok:false → error', () => {
    const verse: UnifiedVerse = {
      key: '1:1',
      surah: 1,
      ayah: 1,
      source: 'Al-Quran Cloud',
      text: 'بسم الله الرحمن الرحيم',
    }
    const ok: GetResult = {
      ok: true,
      value: { ref: { surah: 1, ayah: 1 }, text: okPart(verse, 'alquran_cloud', attempts) },
      attempts,
    }

    if (ok.ok) {
      expectTypeOf(ok.value.text).toEqualTypeOf<Part<UnifiedVerse> | undefined>()
      expect(ok.value.text?.value?.text).toContain('بسم')
    }
  })
})
