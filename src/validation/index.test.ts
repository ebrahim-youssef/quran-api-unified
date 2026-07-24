import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import {
  parseUnifiedVerse,
  safeParseUnifiedVerse,
  unifiedAudioSchema,
  unifiedTafsirSchema,
  unifiedTranslationSchema,
  unifiedVerseSchema,
} from './index.js'
import type {
  UnifiedAudio,
  UnifiedTafsir,
  UnifiedTranslation,
  UnifiedVerse,
} from '../core/schema.js'

const verse: UnifiedVerse = {
  key: '1:1',
  surah: 1,
  ayah: 1,
  source: 'Al-Quran Cloud',
  text: 'بِسْمِ اللَّهِ',
  meta: { juz: 1, page: 1 },
}

const audio: UnifiedAudio = {
  key: '1:1',
  surah: 1,
  ayah: 1,
  scope: 'ayah',
  source: 'Al-Quran Cloud',
  reciter: 'ar.alafasy',
  url: 'https://cdn.example/1.mp3',
  format: 'mp3',
}

describe('zod entry — parsing', () => {
  it('parses a valid UnifiedVerse', () => {
    expect(parseUnifiedVerse(verse)).toEqual(verse)
  })

  it('safeParse succeeds on valid input and fails on malformed', () => {
    expect(safeParseUnifiedVerse(verse).success).toBe(true)
    // missing `text`, wrong `surah` type
    expect(safeParseUnifiedVerse({ key: '1:1', surah: '1', ayah: 1, source: 'x' }).success).toBe(
      false,
    )
  })

  it('rejects a malformed audio (bad enum) and accepts a valid one', () => {
    expect(unifiedAudioSchema.safeParse(audio).success).toBe(true)
    expect(unifiedAudioSchema.safeParse({ ...audio, format: 'wav' }).success).toBe(false)
    expect(unifiedAudioSchema.safeParse({ ...audio, scope: 'juz' }).success).toBe(false)
  })
})

describe('zod entry — type sync (schemas mirror the TS types, modulo readonly)', () => {
  it('UnifiedVerse', () => {
    expectTypeOf<z.infer<typeof unifiedVerseSchema>>().toMatchTypeOf<UnifiedVerse>()
    expectTypeOf<UnifiedVerse>().toMatchTypeOf<z.infer<typeof unifiedVerseSchema>>()
  })
  it('UnifiedAudio', () => {
    expectTypeOf<z.infer<typeof unifiedAudioSchema>>().toMatchTypeOf<UnifiedAudio>()
    expectTypeOf<UnifiedAudio>().toMatchTypeOf<z.infer<typeof unifiedAudioSchema>>()
  })
  it('UnifiedTranslation', () => {
    expectTypeOf<z.infer<typeof unifiedTranslationSchema>>().toMatchTypeOf<UnifiedTranslation>()
    expectTypeOf<UnifiedTranslation>().toMatchTypeOf<z.infer<typeof unifiedTranslationSchema>>()
  })
  it('UnifiedTafsir', () => {
    expectTypeOf<z.infer<typeof unifiedTafsirSchema>>().toMatchTypeOf<UnifiedTafsir>()
    expectTypeOf<UnifiedTafsir>().toMatchTypeOf<z.infer<typeof unifiedTafsirSchema>>()
  })
})
