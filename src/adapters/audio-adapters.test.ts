import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { alquranCloud } from './alquran-cloud.js'
import { quranApiEdge } from './quran-api-edge.js'
import type { AdapterContext, CapabilityHandler } from '../ports/adapter.js'
import type { AudioQuery, UnifiedAudio } from '../core/schema.js'

const ctx: AdapterContext = {}
const q: AudioQuery = { surah: 1, ayah: 1 }

function fixture(path: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../test/fixtures/${path}`, import.meta.url)), 'utf8'),
  )
}

describe('alquran_cloud audio', () => {
  const handler = alquranCloud.audio as CapabilityHandler<AudioQuery, UnifiedAudio>

  it('builds the audio URL with the default reciter and an explicit one', () => {
    expect(handler.buildUrl(q, ctx)).toBe('https://api.alquran.cloud/v1/ayah/1:1/ar.alafasy')
    expect(handler.buildUrl({ surah: 1, ayah: 1, reciter: 'ar.husary' }, ctx)).toBe(
      'https://api.alquran.cloud/v1/ayah/1:1/ar.husary',
    )
  })

  it('maps the fixture to a UnifiedAudio with a working mp3 URL (ayah scope)', () => {
    const a = handler.transform(fixture('alquran_cloud/audio-1-1.json'), q, ctx)
    expect(a.key).toBe('1:1')
    expect(a.scope).toBe('ayah')
    expect(a.source).toBe('Al-Quran Cloud')
    expect(a.format).toBe('mp3')
    expect(a.url).toMatch(/^https?:\/\/.*\.mp3$/)
    expect(a.reciter).toBe('ar.alafasy')
  })
})

describe('quran_api_edge audio', () => {
  const handler = quranApiEdge.audio as CapabilityHandler<AudioQuery, UnifiedAudio>

  it('builds the single-file URL', () => {
    expect(handler.buildUrl(q, ctx)).toBe('https://quranapi.pages.dev/api/1/1.json')
  })

  it('defaults to the first reciter in the audio map', () => {
    const a = handler.transform(fixture('quran_api_edge/text-1-1.json'), q, ctx)
    expect(a.scope).toBe('ayah')
    expect(a.url).toMatch(/^https?:\/\//)
    expect(a.reciter).toBe('Mishary Rashid Al Afasy')
    expect(a.meta?.reciterId).toBe('1')
  })

  it('honors an explicitly requested reciter id', () => {
    const a = handler.transform(
      fixture('quran_api_edge/text-1-1.json'),
      { ...q, reciter: '2' },
      ctx,
    )
    expect(a.reciter).toBe('Abu Bakr Al Shatri')
    expect(a.meta?.reciterId).toBe('2')
  })
})
