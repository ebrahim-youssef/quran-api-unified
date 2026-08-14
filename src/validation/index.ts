/**
 * Optional validation entry, published as `quran-api-unified/zod`.
 *
 * `zod` is an **optional peer dependency** — importing the library core never pulls it in;
 * only consumers who import this entry need it installed. These schemas mirror the unified
 * types from `core/schema`, with `parse`/`safeParse` helpers for callers who want
 * runtime-checked, parsed results. A type-sync test keeps the schemas aligned with the TS
 * types, so drift fails the build.
 */

import { z } from 'zod'

/** Provider-specific extra fields; narrowed to `page` (ADR consequence of the v0.3 schema kernel). */
export const unifiedMetaSchema = z.object({ page: z.number().optional() })

/** A reference to a verse or a whole chapter. */
export const refSchema = z.object({
  chapter: z.number(),
  verse: z.number().optional(),
})

/** Schema for a verse's structural position. */
export const structuralPositionSchema = z.object({
  part: z.number(),
  group: z.number(),
  quarter: z.number(),
})

/** Schema for {@link UnifiedVerse}. */
export const unifiedVerseSchema = z.object({
  key: z.string(),
  chapter: z.number(),
  verse: z.number(),
  text: z.string(),
  structure: structuralPositionSchema,
  meta: unifiedMetaSchema.optional(),
})

/** Schema for {@link UnifiedAudio}. */
export const unifiedAudioSchema = z.object({
  key: z.string(),
  chapter: z.number(),
  verse: z.number().optional(),
  scope: z.enum(['verse', 'chapter']),
  reciter: z.string(),
  url: z.string(),
  format: z.enum(['mp3', 'ogg']),
  meta: unifiedMetaSchema.optional(),
})

/** Schema for {@link UnifiedTranslation}. */
export const unifiedTranslationSchema = z.object({
  key: z.string(),
  chapter: z.number(),
  verse: z.number(),
  edition: z.string(),
  language: z.string(),
  text: z.string(),
  meta: unifiedMetaSchema.optional(),
})

/** Schema for {@link UnifiedExegesis}. */
export const unifiedExegesisSchema = z.object({
  key: z.string(),
  chapter: z.number(),
  verse: z.number(),
  exegesisId: z.string(),
  language: z.string().optional(),
  text: z.string(),
  meta: unifiedMetaSchema.optional(),
})

/** Parses and validates a {@link UnifiedVerse}; throws a `ZodError` on invalid input. */
export const parseUnifiedVerse = (data: unknown) => unifiedVerseSchema.parse(data)
/** Non-throwing variant of {@link parseUnifiedVerse}. */
export const safeParseUnifiedVerse = (data: unknown) => unifiedVerseSchema.safeParse(data)

/** Parses and validates a {@link UnifiedAudio}; throws a `ZodError` on invalid input. */
export const parseUnifiedAudio = (data: unknown) => unifiedAudioSchema.parse(data)
/** Non-throwing variant of {@link parseUnifiedAudio}. */
export const safeParseUnifiedAudio = (data: unknown) => unifiedAudioSchema.safeParse(data)

/** Parses and validates a {@link UnifiedTranslation}; throws a `ZodError` on invalid input. */
export const parseUnifiedTranslation = (data: unknown) => unifiedTranslationSchema.parse(data)
/** Non-throwing variant of {@link parseUnifiedTranslation}. */
export const safeParseUnifiedTranslation = (data: unknown) =>
  unifiedTranslationSchema.safeParse(data)

/** Parses and validates a {@link UnifiedExegesis}; throws a `ZodError` on invalid input. */
export const parseUnifiedExegesis = (data: unknown) => unifiedExegesisSchema.parse(data)
/** Non-throwing variant of {@link parseUnifiedExegesis}. */
export const safeParseUnifiedExegesis = (data: unknown) => unifiedExegesisSchema.safeParse(data)
