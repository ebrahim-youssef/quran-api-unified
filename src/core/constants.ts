/**
 * Library-wide constants — no magic values scattered through the code. This module has zero
 * imports and performs no I/O.
 *
 * Provider base URLs are not here: they are adapter-private config and live beside the
 * adapter that uses them (only that one adapter ever references its own base URL).
 */

/** Default per-request timeout, in milliseconds, applied when the caller does not override it. */
export const DEFAULT_TIMEOUT_MS = 10_000
