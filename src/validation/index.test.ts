import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import {
  parseUnifiedVerse,
  safeParseUnifiedVerse,
  unifiedAudioSchema,
  unifiedExegesisSchema,
  unifiedTranslationSchema,
  unifiedVerseSchema,
} from './index.js'
import type {
  UnifiedAudio,
  UnifiedExegesis,
  UnifiedTranslation,
  UnifiedVerse,
} from '../core/schema.js'

const verse: UnifiedVerse = {
  key: '1:1',
  chapter: 1,
  verse: 1,
  text: 'بِسْمِ اللَّهِ',
  structure: { part: 1, group: 1, quarter: 1 },
  meta: { page: 1 },
}

const audio: UnifiedAudio = {
  key: '1:1',
  chapter: 1,
  verse: 1,
  scope: 'verse',
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
    // missing `text`, wrong `chapter` type, missing `structure`
    expect(safeParseUnifiedVerse({ key: '1:1', chapter: '1', verse: 1 }).success).toBe(false)
  })

  it('rejects a malformed audio (bad enum) and accepts a valid one', () => {
    expect(unifiedAudioSchema.safeParse(audio).success).toBe(true)
    expect(unifiedAudioSchema.safeParse({ ...audio, format: 'wav' }).success).toBe(false)
    expect(unifiedAudioSchema.safeParse({ ...audio, scope: 'part' }).success).toBe(false)
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
  it('UnifiedExegesis', () => {
    expectTypeOf<z.infer<typeof unifiedExegesisSchema>>().toMatchTypeOf<UnifiedExegesis>()
    expectTypeOf<UnifiedExegesis>().toMatchTypeOf<z.infer<typeof unifiedExegesisSchema>>()
  })
})
