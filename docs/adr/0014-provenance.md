# ADR-0014 — Provenance: placement, trust, and injection

- **Status:** accepted
- **Date:** 2026-08-07

## Context

v0.2's `Part.source` is a flat adapter-name string. The canonical schema wants richer
provenance — which provider, which of its resources, what URL and version, and when it was
retrieved — without polluting the pure `Unified*` value types with envelope concerns, and
without ever fabricating a version or resource id a provider doesn't actually expose.

## Decision

`Provenance` replaces `Outcome<T>.source` (formerly `Part<T>.source`, see ADR on the
`Outcome` rename in the schema kernel task); the `Unified*` value types carry none of it —
the same split an HTTP response draws between headers and body.

```ts
export interface Provenance {
  readonly provider: { readonly id: string; readonly name: string }
  readonly providerResourceId?: string
  readonly sourceUrl?: string
  readonly sourceVersion?: string
  readonly retrievedAt: string
}
```

`provider` is a plain `{ id, name }` pair, not a `ResourceRef` — adapter/provider identity is
an internal implementation detail, not a canonical Quranic resource presented to end users, so
it does not need `ResourceRef`'s bilingual `LocalizedName`. (This corrects a drafting slip in
this ADR's original text, caught during Task 3's review: `src/core/identity.ts` as committed,
and the task brief that specified it, both already used the inline shape below — the decision
itself was never `ResourceRef`, only this document's Decision block said so.)

`sourceUrl` and `retrievedAt` are captured by the client's `runAttempt`, at the same point
`durationMs` is measured — never inside an adapter's `transform`, preserving the pure-handler
contract (no `Date.now()`, no I/O inside `transform`). `sourceVersion` and
`providerResourceId` are populated only when an adapter supplies an optional pure extractor
function on its `CapabilityHandler`; when omitted, they stay `undefined` rather than guessed.
_Rejected:_ embedding `Provenance` inside each `Unified*` value (mixes envelope metadata into
what's meant to be pure normalized data, and duplicates it it if both the `Outcome` and the
value carried it); a generic response-header sniffer for `sourceVersion` (unreliable across
providers with no consistent versioning header, would produce untrustworthy data).

## Consequences

`CapabilityHandler` gains two more optional pure fields: `sourceVersion?` and
`providerResourceId?`, both `(raw, q, ctx) => string | undefined`. `AttemptOutcome` gains a
`provenance?: Provenance` field the client constructs and threads through `compose`'s
`runChain` onto the winning `Outcome`. Populating the two optional extractors for a given
adapter happens during that adapter's own migration, not as a day-one requirement across all
built-ins. Revisit if a provider's version signal turns out to need richer structure than a
single string.
