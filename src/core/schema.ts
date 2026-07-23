/**
 * The unified schema — every provider's response is normalized into these shapes so a
 * consumer never branches on which provider served a request.
 *
 * Import boundary (docs/stack.md §2): this module is types only. It imports nothing and
 * must never import `core/http.ts` or anything that performs I/O.
 */

/**
 * A reference to a single ayah (verse) or a whole surah (chapter). Omit `ayah` to mean
 * "the whole surah." Juz-level references are deferred — see `docs/backlog.md`.
 */
export interface Ref {
  /** Surah number, 1–114. */
  readonly surah: number
  /** Ayah number within the surah. Omit to reference the whole surah. */
  readonly ayah?: number
}

/**
 * Provider-specific extra fields that don't have a unified home yet (e.g. juz/page/hizb
 * numbering). Consumers may read these, but only the named fields are guaranteed stable
 * across providers.
 */
export interface UnifiedMeta {
  readonly juz?: number
  readonly page?: number
  readonly [key: string]: unknown
}

/** A query for verse text, resolved by a `text` capability handler. */
export type VerseQuery = Ref

/** A normalized verse (ayah) text result. */
export interface UnifiedVerse {
  /** `"surah:ayah"`, unique per verse. */
  readonly key: string
  readonly surah: number
  readonly ayah: number
  /** Display name of the adapter that produced this value, e.g. `"Al-Quran Cloud"`. */
  readonly source: string
  readonly text: string
  readonly meta?: UnifiedMeta
}

/** A query for recitation audio, resolved by an `audio` capability handler. */
export interface AudioQuery extends Ref {
  /** Reciter identifier; adapter-specific default applies when omitted. */
  readonly reciter?: string
}

/** A normalized audio result, for either a single ayah or a whole surah. */
export interface UnifiedAudio {
  /** `"surah:ayah"` for ayah scope, `"surah"` for surah scope. */
  readonly key: string
  readonly surah: number
  /** Present only when `scope` is `'ayah'`. */
  readonly ayah?: number
  readonly scope: 'ayah' | 'surah'
  readonly source: string
  readonly reciter: string
  readonly url: string
  readonly format: 'mp3' | 'ogg'
  readonly meta?: UnifiedMeta
}

/** A query for a translation, resolved by a `translation` capability handler. */
export interface TranslationQuery extends Ref {
  /** Provider-specific edition identifier; adapter-specific default applies when omitted. */
  readonly edition?: string
}

/** A normalized translation result for one verse. */
export interface UnifiedTranslation {
  readonly key: string
  readonly surah: number
  readonly ayah: number
  readonly source: string
  /** The edition actually served (echoes the request or the adapter's default). */
  readonly edition: string
  /** BCP-47-ish language tag, e.g. `"en"`. */
  readonly language: string
  readonly text: string
  readonly meta?: UnifiedMeta
}

/** A query for tafsir (exegesis), resolved by a `tafsir` capability handler. */
export interface TafsirQuery extends Ref {
  /** Provider-specific tafsir identifier; adapter-specific default applies when omitted. */
  readonly tafsirId?: string
}

/** A normalized tafsir result for one verse. */
export interface UnifiedTafsir {
  readonly key: string
  readonly surah: number
  readonly ayah: number
  readonly source: string
  readonly tafsirId: string
  readonly text: string
  readonly meta?: UnifiedMeta
}
