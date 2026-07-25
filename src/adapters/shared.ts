/**
 * Small pure helpers shared across adapter transforms. A sibling adapters may import — this
 * does not cross the import boundary (only `core/http` and the client are forbidden).
 */

/** Strips a leading byte-order mark (U+FEFF), which some providers prefix onto text bodies. */
export function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/** Builds the canonical `"surah:ayah"` verse key. A missing `ayah` defaults to `1`. */
export function verseKey(surah: number, ayah?: number): string {
  return `${surah}:${ayah ?? 1}`
}

/** Splits a canonical `"surah:ayah"` verse key back into its numbers. */
export function parseVerseKey(key: string): { surah: number; ayah: number } {
  const [surah, ayah] = key.split(':').map(Number)
  return { surah: surah ?? 0, ayah: ayah ?? 0 }
}
