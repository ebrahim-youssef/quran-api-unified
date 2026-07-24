/**
 * Registry of built-in provider adapters. Populated as adapters land in later tickets
 * (text, audio, translation, tafsir). Kept as a typed empty tuple for now so the public
 * surface and the composition root can already reference it.
 *
 * Import boundary: adapters are declarative (a `buildUrl` recipe + a pure `transform`).
 * Nothing here may import `core/http` — not even for types — nor the client. Enforced by
 * ESLint; see `eslint.config.js`.
 */
import type { Adapter } from '../ports/adapter.js'
import { alquranCloud } from './alquran-cloud.js'
import { quranApiEdge } from './quran-api-edge.js'
import { quranHub } from './quran-hub.js'
import { quranFinder } from './quran-finder.js'

/**
 * The built-in provider adapters, in default preference order. Auto-selection tries them in
 * this order per concern, falling back on failure. Al-Quran Cloud leads for text (open, broad,
 * stable); the edge API is a fast second; Quran Hub and Quran Explorer round out the fallback.
 */
export const builtinAdapters: readonly Adapter[] = [
  alquranCloud,
  quranApiEdge,
  quranHub,
  quranFinder,
]
