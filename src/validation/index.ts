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

/** Provider-specific extra fields; named positions plus an open bag of unknowns. */
export const unifiedMetaSchema = z
  .object({ juz: z.number().optional(), page: z.number().optional() })
  .catchall(z.unknown())

/** A reference to an ayah or a whole surah. */
export const refSchema = z.object({
  surah: z.number(),
  ayah: z.number().optional(),
})

/** Schema for {@link UnifiedVerse}. */
export const unifiedVerseSchema = z.object({
  key: z.string(),
  surah: z.number(),
  ayah: z.number(),
  source: z.string(),
  text: z.string(),
  meta: unifiedMetaSchema.optional(),
})

/** Schema for {@link UnifiedAudio}. */
export const unifiedAudioSchema = z.object({
  key: z.string(),
  surah: z.number(),
  ayah: z.number().optional(),
  scope: z.enum(['ayah', 'surah']),
  source: z.string(),
  reciter: z.string(),
  url: z.string(),
  format: z.enum(['mp3', 'ogg']),
  meta: unifiedMetaSchema.optional(),
})

/** Schema for {@link UnifiedTranslation}. */
export const unifiedTranslationSchema = z.object({
  key: z.string(),
  surah: z.number(),
  ayah: z.number(),
  source: z.string(),
  edition: z.string(),
  language: z.string(),
  text: z.string(),
  meta: unifiedMetaSchema.optional(),
})

/** Schema for {@link UnifiedTafsir}. */
export const unifiedTafsirSchema = z.object({
  key: z.string(),
  surah: z.number(),
  ayah: z.number(),
  source: z.string(),
  tafsirId: z.string(),
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

/** Parses and validates a {@link UnifiedTafsir}; throws a `ZodError` on invalid input. */
export const parseUnifiedTafsir = (data: unknown) => unifiedTafsirSchema.parse(data)
/** Non-throwing variant of {@link parseUnifiedTafsir}. */
export const safeParseUnifiedTafsir = (data: unknown) => unifiedTafsirSchema.safeParse(data)
