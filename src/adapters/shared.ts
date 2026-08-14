/**
 * Small pure helpers shared across adapter transforms. A sibling adapters may import — this
 * does not cross the import boundary (only `core/http` and the client are forbidden).
 */

/** Strips a leading byte-order mark (U+FEFF), which some providers prefix onto text bodies. */
export function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/** Builds the canonical `"chapter:verse"` verse key. A missing `verse` defaults to `1`. */
export function verseKey(chapter: number, verse?: number): string {
  return `${chapter}:${verse ?? 1}`
}

/** Splits a canonical `"chapter:verse"` verse key back into its numbers. */
export function parseVerseKey(key: string): { chapter: number; verse: number } {
  const [chapter, verse] = key.split(':').map(Number)
  return { chapter: chapter ?? 0, verse: verse ?? 0 }
}
