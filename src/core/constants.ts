/**
 * Library-wide constants — no magic values scattered through the code. This module has zero
 * imports and performs no I/O. Provider base URLs live with their adapters, not here.
 */

/** Default per-request timeout, in milliseconds, applied when the caller does not override it. */
export const DEFAULT_TIMEOUT_MS = 10_000
