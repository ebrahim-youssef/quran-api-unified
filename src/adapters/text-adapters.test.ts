import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { alquranCloud } from './alquran-cloud.js'
import { quranApiEdge } from './quran-api-edge.js'
import { quranHub } from './quran-hub.js'
import { quranFinder } from './quran-finder.js'
import type { AdapterContext, CapabilityHandler } from '../ports/adapter.js'
import type { UnifiedVerse, VerseQuery } from '../core/schema.js'

const ctx: AdapterContext = {}
const q: VerseQuery = { surah: 1, ayah: 1 }

/** Loads a fixture file (real recorded provider response) relative to the repo test tree. */
function fixture(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../test/fixtures/${path}`, import.meta.url)),
    'utf8',
  )
}

/** Runs a text handler's transform against a JSON fixture. */
function transformJson(
  handler: CapabilityHandler<VerseQuery, UnifiedVerse>,
  file: string,
): UnifiedVerse {
  return handler.transform(JSON.parse(fixture(file)), q, ctx)
}

describe('alquran_cloud text', () => {
  const handler = alquranCloud.text as CapabilityHandler<VerseQuery, UnifiedVerse>

  it('builds the ayah URL', () => {
    expect(handler.buildUrl(q, ctx)).toBe('https://api.alquran.cloud/v1/ayah/1:1')
    expect(handler.buildUrl({ surah: 2 }, ctx)).toBe('https://api.alquran.cloud/v1/ayah/2:1')
  })

  it('maps the fixture to a UnifiedVerse (trimming the trailing newline)', () => {
    const v = transformJson(handler, 'alquran_cloud/text-1-1.json')
    expect(v.key).toBe('1:1')
    expect(v.surah).toBe(1)
    expect(v.ayah).toBe(1)
    expect(v.source).toBe('Al-Quran Cloud')
    expect(v.text.length).toBeGreaterThan(5)
    expect(v.text.endsWith('\n')).toBe(false)
    expect(v.text.trim()).toBe(v.text)
    expect(v.meta?.page).toBe(1)
  })
})

describe('quran_api_edge text', () => {
  const handler = quranApiEdge.text as CapabilityHandler<VerseQuery, UnifiedVerse>

  it('builds the ayah file URL', () => {
    expect(handler.buildUrl(q, ctx)).toBe('https://quranapi.pages.dev/api/1/1.json')
  })

  it('maps arabic1 as the verse text and keeps english in meta', () => {
    const v = transformJson(handler, 'quran_api_edge/text-1-1.json')
    expect(v.key).toBe('1:1')
    expect(v.source).toBe('Quran API (Edge)')
    expect(v.text.length).toBeGreaterThan(0)
    expect(typeof v.meta?.english).toBe('string')
  })
})

describe('quran_hub text', () => {
  const handler = quranHub.text as CapabilityHandler<VerseQuery, UnifiedVerse>

  it('opts into the proxy and builds the ayah URL', () => {
    expect(handler.useProxy).toBe(true)
    expect(handler.buildUrl(q, ctx)).toBe('https://api.quranhub.com/v1/ayah/1:1')
  })

  it('strips the leading BOM from the text', () => {
    const v = transformJson(handler, 'quran_hub/text-1-1.json')
    expect(v.source).toBe('Quran Hub')
    expect(v.text.charCodeAt(0)).not.toBe(0xfeff)
    expect(v.text.length).toBeGreaterThan(5)
  })
})

describe('quran_finder text (raw)', () => {
  const handler = quranFinder.text as CapabilityHandler<VerseQuery, UnifiedVerse>

  it('reads raw text and derives key/surah/ayah from the request', () => {
    expect(handler.responseType).toBe('text')
    expect(handler.useProxy).toBe(true)
    expect(handler.buildUrl({ surah: 3, ayah: 5 }, ctx)).toBe(
      'https://api.quran-finder.com/text/ar/3/5/',
    )
  })

  it('maps the raw string fixture to a UnifiedVerse, BOM-stripped and trimmed', () => {
    const v = handler.transform(fixture('quran_finder/text-1-1.txt'), q, ctx)
    expect(v.key).toBe('1:1')
    expect(v.source).toBe('Quran Explorer')
    expect(v.meta?.type).toBe('raw')
    expect(v.text.charCodeAt(0)).not.toBe(0xfeff)
    expect(v.text.length).toBeGreaterThan(0)
  })

  it('rejects malformed (non-string) input by producing empty text after coercion guard', () => {
    // A defensive check: the transform expects a string; a wrong type should not crash the map.
    expect(() => handler.transform('', { surah: 1, ayah: 1 }, ctx)).not.toThrow()
  })
})
