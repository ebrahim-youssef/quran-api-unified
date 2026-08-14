import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { spa5kExegesis } from './spa5k-exegesis.js'
import type { AdapterContext, CapabilityHandler } from '../ports/adapter.js'
import type { ExegesisQuery, UnifiedExegesis } from '../core/schema.js'

const ctx: AdapterContext = {}
const q: ExegesisQuery = { chapter: 1, verse: 1 }

function fixture(path: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../test/fixtures/${path}`, import.meta.url)), 'utf8'),
  )
}

describe('spa5k_exegesis', () => {
  const handler = spa5kExegesis.exegesis as CapabilityHandler<ExegesisQuery, UnifiedExegesis>

  it('builds the URL with the default edition and an explicit one', () => {
    expect(handler.buildUrl(q, ctx)).toBe(
      'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/1/1.json',
    )
    expect(
      handler.buildUrl({ chapter: 2, verse: 5, exegesisId: 'en-tafisr-ibn-kathir' }, ctx),
    ).toBe('https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir/2/5.json')
  })

  it('maps the fixture to a UnifiedExegesis with an id and derived language', () => {
    const t = handler.transform(
      fixture('spa5k_tafsir/tafsir-1-1.json'),
      {
        ...q,
        exegesisId: 'en-tafisr-ibn-kathir',
      },
      ctx,
    )
    expect(t.key).toBe('1:1')
    expect(t.exegesisId).toBe('en-tafisr-ibn-kathir')
    expect(t.language).toBe('en')
    expect(t.text.length).toBeGreaterThan(20)
  })
})
