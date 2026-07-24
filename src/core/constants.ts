/**
 * Library-wide constants — no magic values scattered through the code. This module has zero
 * imports and performs no I/O.
 */

/** Default per-request timeout, in milliseconds, applied when the caller does not override it. */
export const DEFAULT_TIMEOUT_MS = 10_000

/** Al-Quran Cloud API base (text, audio, translation). */
export const ALQURAN_CLOUD_BASE = 'https://api.alquran.cloud/v1'

/** Quran API (Edge) base — one JSON file per ayah carries text + audio. */
export const QURAN_API_EDGE_BASE = 'https://quranapi.pages.dev/api'

/** Quran Hub API base (text; Al-Quran-Cloud-compatible shape). */
export const QURAN_HUB_BASE = 'https://api.quranhub.com/v1'

/** Quran Explorer (Quran Finder) base — raw-text ayah endpoint. */
export const QURAN_FINDER_BASE = 'https://api.quran-finder.com'

/** spa5k tafsir_api base — static tafsir JSON over the jsDelivr CDN. */
export const SPA5K_TAFSIR_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main'

/** Quran Foundation official content API base (v4), behind OAuth2. */
export const QURAN_FOUNDATION_CONTENT_BASE = 'https://apis.quran.foundation/content/api/v4'

/** Quran Foundation OAuth2 token endpoint (client-credentials grant). */
export const QURAN_FOUNDATION_TOKEN_URL = 'https://oauth2.quran.foundation/oauth2/token'
