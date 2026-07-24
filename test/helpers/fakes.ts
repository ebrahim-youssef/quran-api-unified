/**
 * Test helpers — typed fake adapters and an injectable fake `fetch`. No network, no mocking
 * library: adapters describe calls and the fake fetch routes by URL (docs/stack.md §8).
 */

import type { FetchLike } from '../../src/core/http.js'
import type { Adapter, AuthKind, Capability, CapabilityHandler } from '../../src/ports/adapter.js'
import type {
  AudioQuery,
  TafsirQuery,
  TranslationQuery,
  UnifiedAudio,
  UnifiedTafsir,
  UnifiedTranslation,
  UnifiedVerse,
  VerseQuery,
} from '../../src/core/schema.js'

/** A URL every fake handler builds; the id segment lets the fake fetch route by adapter. */
export const url = (id: string, cap: Capability): string => `https://test.local/${cap}/${id}`

function textHandler(id: string): CapabilityHandler<VerseQuery, UnifiedVerse> {
  return {
    buildUrl: () => url(id, 'text'),
    transform: (raw, q) => ({
      key: `${q.surah}:${q.ayah ?? 1}`,
      surah: q.surah,
      ayah: q.ayah ?? 1,
      source: id,
      text: (raw as { text: string }).text,
    }),
  }
}

function audioHandler(id: string): CapabilityHandler<AudioQuery, UnifiedAudio> {
  return {
    buildUrl: () => url(id, 'audio'),
    transform: (raw, q) => ({
      key: `${q.surah}:${q.ayah ?? 1}`,
      surah: q.surah,
      ayah: q.ayah ?? 1,
      scope: 'ayah',
      source: id,
      reciter: q.reciter ?? 'default',
      url: (raw as { url: string }).url,
      format: 'mp3',
    }),
  }
}

function translationHandler(id: string): CapabilityHandler<TranslationQuery, UnifiedTranslation> {
  return {
    buildUrl: () => url(id, 'translation'),
    transform: (raw, q) => ({
      key: `${q.surah}:${q.ayah ?? 1}`,
      surah: q.surah,
      ayah: q.ayah ?? 1,
      source: id,
      edition: q.edition ?? 'default',
      language: 'en',
      text: (raw as { text: string }).text,
    }),
  }
}

function tafsirHandler(id: string): CapabilityHandler<TafsirQuery, UnifiedTafsir> {
  return {
    buildUrl: () => url(id, 'tafsir'),
    transform: (raw, q) => ({
      key: `${q.surah}:${q.ayah ?? 1}`,
      surah: q.surah,
      ayah: q.ayah ?? 1,
      source: id,
      tafsirId: q.tafsirId ?? 'default',
      text: (raw as { text: string }).text,
    }),
  }
}

/** Builds a typed fake adapter serving the given capabilities. */
export function makeAdapter(
  id: string,
  capabilities: readonly Capability[],
  auth: AuthKind = 'none',
): Adapter {
  return {
    id,
    name: id,
    capabilities,
    auth,
    ...(capabilities.includes('text') ? { text: textHandler(id) } : {}),
    ...(capabilities.includes('audio') ? { audio: audioHandler(id) } : {}),
    ...(capabilities.includes('translation') ? { translation: translationHandler(id) } : {}),
    ...(capabilities.includes('tafsir') ? { tafsir: tafsirHandler(id) } : {}),
  }
}

/** How the fake fetch should respond for a given URL. */
export type Behavior =
  | { readonly kind: 'ok'; readonly body: unknown }
  | { readonly kind: 'http'; readonly status: number }
  | { readonly kind: 'network' }

/**
 * An injectable `fetch` that responds per exact URL. Unlisted URLs 404. Records each requested
 * URL on `.calls` for assertions.
 */
export function makeFetch(routes: Record<string, Behavior>): FetchLike & { calls: string[] } {
  const calls: string[] = []
  const impl = (input: string | URL | Request): Promise<Response> => {
    const requested = typeof input === 'string' ? input : input.toString()
    calls.push(requested)
    const behavior = routes[requested] ?? { kind: 'http', status: 404 }
    if (behavior.kind === 'network')
      return Promise.reject(new Error(`network error for ${requested}`))
    if (behavior.kind === 'http')
      return Promise.resolve(new Response('err', { status: behavior.status }))
    return Promise.resolve(new Response(JSON.stringify(behavior.body), { status: 200 }))
  }
  const fetchImpl = impl as unknown as FetchLike & { calls: string[] }
  fetchImpl.calls = calls
  return fetchImpl
}
