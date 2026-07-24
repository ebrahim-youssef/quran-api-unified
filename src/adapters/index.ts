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

/** The built-in provider adapters, in preference order. Empty until adapters land (#7+). */
export const builtinAdapters: readonly Adapter[] = []
