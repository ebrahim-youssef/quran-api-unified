/**
 * Per-word data and the ayah/slot/word alignment layer (ADR-0015, ADR-0016). Pure types
 * only — this module imports nothing and must never import `core/http.ts` or anything that
 * performs I/O, same discipline as `core/schema.ts`.
 */

/** A single word occurrence: canonical id, text, and morphology, when known. */
export interface UnifiedWord {
  readonly id: string // "{chapter}:{verse}:{position}" for the base transmission
  readonly text: string
  readonly transliteration?: string
  readonly translation?: string
  readonly root?: string
  readonly lemma?: string
}

/**
 * One alignment coordinate in the base transmission's (Ḥafṣ ʿan ʿĀṣim) word sequence
 * (ADR-0016). `words` holds the transmission's resolution at this position: empty when the
 * transmission omits it, one entry normally, more than one for a rare inserted word.
 */
export interface UnifiedWordSlot {
  readonly slot: number
  readonly words: readonly UnifiedWord[]
}
