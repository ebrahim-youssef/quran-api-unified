import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { spa5kTafsir } from './spa5k-tafsir.js'
import type { AdapterContext, CapabilityHandler } from '../ports/adapter.js'
import type { TafsirQuery, UnifiedTafsir } from '../core/schema.js'

const ctx: AdapterContext = {}
const q: TafsirQuery = { surah: 1, ayah: 1 }

function fixture(path: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../test/fixtures/${path}`, import.meta.url)), 'utf8'),
  )
}

describe('spa5k_tafsir', () => {
  const handler = spa5kTafsir.tafsir as CapabilityHandler<TafsirQuery, UnifiedTafsir>

  it('builds the URL with the default edition and an explicit one', () => {
    expect(handler.buildUrl(q, ctx)).toBe(
      'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/1/1.json',
    )
    expect(handler.buildUrl({ surah: 2, ayah: 5, tafsirId: 'en-tafisr-ibn-kathir' }, ctx)).toBe(
      'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir/2/5.json',
    )
  })

  it('maps the fixture to a UnifiedTafsir with an id and derived language', () => {
    const t = handler.transform(
      fixture('spa5k_tafsir/tafsir-1-1.json'),
      {
        ...q,
        tafsirId: 'en-tafisr-ibn-kathir',
      },
      ctx,
    )
    expect(t.key).toBe('1:1')
    expect(t.source).toBe('Tafsir API (spa5k)')
    expect(t.tafsirId).toBe('en-tafisr-ibn-kathir')
    expect(t.meta?.language).toBe('en')
    expect(t.text.length).toBeGreaterThan(20)
  })
})
