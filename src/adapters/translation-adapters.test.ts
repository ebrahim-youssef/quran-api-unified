import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { alquranCloud } from './alquran-cloud.js'
import type { AdapterContext, CapabilityHandler } from '../ports/adapter.js'
import type { TranslationQuery, UnifiedTranslation } from '../core/schema.js'

const ctx: AdapterContext = {}
const q: TranslationQuery = { surah: 1, ayah: 1 }

function fixture(path: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../test/fixtures/${path}`, import.meta.url)), 'utf8'),
  )
}

describe('alquran_cloud translation', () => {
  const handler = alquranCloud.translation as CapabilityHandler<
    TranslationQuery,
    UnifiedTranslation
  >

  it('builds the URL with the default edition and an explicit one', () => {
    expect(handler.buildUrl(q, ctx)).toBe('https://api.alquran.cloud/v1/ayah/1:1/en.sahih')
    expect(handler.buildUrl({ surah: 1, ayah: 1, edition: 'fr.hamidullah' }, ctx)).toBe(
      'https://api.alquran.cloud/v1/ayah/1:1/fr.hamidullah',
    )
  })

  it('maps the fixture to a UnifiedTranslation with edition + language', () => {
    const t = handler.transform(fixture('alquran_cloud/translation-1-1.json'), q, ctx)
    expect(t.key).toBe('1:1')
    expect(t.source).toBe('Al-Quran Cloud')
    expect(t.edition).toBe('en.sahih')
    expect(t.language).toBe('en')
    expect(t.text).toContain('Allah')
  })
})
