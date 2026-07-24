# ADR-0010 — Opt-in raw provider response passthrough

- **Status:** accepted
- **Date:** 2026-07-24

## Context

The library's whole job is to hide provider differences behind the unified schema, and that
stays the default. But two real needs want the *original* provider response too: debugging (why
did a transform produce this?) and showcasing (side-by-side "raw vs unified" to demonstrate what
normalization does). We need a way to retrieve the non-unified response without compromising the
unified-first default or bloating every result.

## Decision

Add an **opt-in** `includeRaw` flag to a `get()` request. When set, each **successful** concern
`Part` carries a `raw: unknown` field: the provider's original response body (the exact value the
adapter's `transform` received — parsed JSON, or the string for text providers). Default is off,
so `raw` is absent and no payloads are retained. Adapters are unchanged: the client already holds
the fetched body before `transform`, so `raw` is captured there and threaded through the pure
composition layer via the injected attempt outcome. Raw is attached to the winning `Part` only.
_Rejected:_ a separate `getRaw()` method (the user wants raw *alongside* unified, not instead);
raw on every attempt including failures (payload bloat for a v1 debugging aid — the attempt trail
already carries each failure's typed error).

## Consequences

`Part<T>` gains an optional `raw?: unknown`; `okPart` gains an optional trailing `raw` argument;
the request type gains `includeRaw?: boolean`. All additive and backward-compatible (a MINOR
bump). Purity holds — `raw` rides the `AttemptOutcome` the client injects, so `core/compose` and
`core/select` still never touch I/O. Revisit if callers need raw for failed attempts or per-concern
raw toggles; that would extend, not break, this contract.
