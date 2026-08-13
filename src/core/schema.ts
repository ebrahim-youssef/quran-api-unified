/**
 * The unified schema — every provider's response is normalized into these shapes so a
 * consumer never branches on which provider served a request.
 *
 * Import boundary (docs/stack.md §2): this module is types only. It imports nothing and
 * must never import `core/http.ts` or anything that performs I/O.
 */

/**
 * A reference to a single verse or a whole chapter. Omit `verse` to mean "the whole
 * chapter." Terminology: `chapter` (was `surah`) and `verse` (was `ayah`) — see the v0.2→v0.3
 * rename table in the schema-first roadmap design doc.
 */
export interface Ref {
  /** Chapter number, 1–114. */
  readonly chapter: number
  /** Verse number within the chapter. Omit to reference the whole chapter. */
  readonly verse?: number
}

/**
 * Provider-specific extra fields that have a canonical home but are edition-dependent.
 * Narrowed in v0.3 (was an unrestricted `[key: string]: unknown` bag): `juz` moved to
 * {@link UnifiedVerse.structure}, which every provider agrees on regardless of edition;
 * `page` stays here because pagination varies by mushaf print layout, so it has no single
 * canonical value yet. Anything else a provider returns is available via `includeRaw`.
 */
export interface UnifiedMeta {
  readonly page?: number
}

/**
 * A verse's position within the Quran's standard structural divisions. Computed centrally
 * from a static `(chapter, verse)` lookup table — every standard mushaf agrees on these
 * boundaries regardless of provider, so this is never adapter-supplied. Always present on a
 * `UnifiedVerse` (not optional): the three numbers are cheap, and repeating them is far
 * lighter than repeating each division's full bilingual name on every one of 6,236 verses.
 */
export interface StructuralPosition {
  /** Which of the 30 parts (was "juz") this verse falls in. */
  readonly part: number
  /** Which of the 60 groups (was "hizb") this verse falls in. */
  readonly group: number
  /** Which quarter-of-a-group (was "rub al-hizb") this verse falls in. */
  readonly quarter: number
}

/** A query for verse text, resolved by a `text` capability handler. */
export interface VerseQuery extends Ref {
  /** A canonical text-edition id (script + transmission pair); adapter-specific default applies when omitted. */
  readonly edition?: string
}

/**
 * A normalized verse (was "ayah") text result. Carries no provenance — that lives on the
 * `Outcome` wrapping it (ADR-0014), keeping this a pure, comparable value.
 */
export interface UnifiedVerse {
  /** `"chapter:verse"`, unique per verse. */
  readonly key: string
  readonly chapter: number
  readonly verse: number
  readonly text: string
  readonly structure: StructuralPosition
  readonly meta?: UnifiedMeta
}

/** A query for recitation audio, resolved by an `audio` capability handler. */
export interface AudioQuery extends Ref {
  /** Reciter identifier; adapter-specific default applies when omitted. */
  readonly reciter?: string
}

/** A normalized audio result, for either a single verse or a whole chapter. */
export interface UnifiedAudio {
  /** `"chapter:verse"` for verse scope, `"chapter"` for chapter scope. */
  readonly key: string
  readonly chapter: number
  /** Present only when `scope` is `'verse'`. */
  readonly verse?: number
  readonly scope: 'verse' | 'chapter'
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
  readonly chapter: number
  readonly verse: number
  /** The edition actually served (echoes the request or the adapter's default). */
  readonly edition: string
  /** BCP-47-ish language tag, e.g. `"en"`. */
  readonly language: string
  readonly text: string
  readonly meta?: UnifiedMeta
}

/** A query for exegesis (was "tafsir"), resolved by an `exegesis` capability handler. */
export interface ExegesisQuery extends Ref {
  /** Provider-specific exegesis-work identifier; adapter-specific default applies when omitted. */
  readonly exegesisId?: string
}

/**
 * A normalized exegesis result for one verse (was `UnifiedTafsir`). Gains a first-class
 * `language` field in v0.3 (matching `UnifiedTranslation`) — its narrowed `UnifiedMeta` no
 * longer has room for a `meta.language` escape-hatch field.
 */
export interface UnifiedExegesis {
  readonly key: string
  readonly chapter: number
  readonly verse: number
  readonly exegesisId: string
  /** BCP-47-ish language tag, e.g. `"en"`, when the adapter can determine one. */
  readonly language?: string
  readonly text: string
  readonly meta?: UnifiedMeta
}
