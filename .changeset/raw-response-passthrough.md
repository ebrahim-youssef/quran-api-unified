---
'quran-api-unified': minor
---

Add opt-in raw provider response passthrough (ADR-0010).

Pass `includeRaw: true` to `get()` and each successful concern `Part` carries `raw` — the
provider's original, un-normalized response body — alongside the unified `value`. Off by
default, so results stay lean. Useful for debugging and for showing raw-vs-unified side by
side. Additive and backward-compatible: adapters are unchanged and the pure composition layer
stays I/O-free.
