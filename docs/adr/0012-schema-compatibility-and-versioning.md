# ADR-0012 — Schema compatibility and versioning

- **Status:** accepted
- **Date:** 2026-08-07

## Context

v0.3 replaces v0.2's shapes outright (canonical chapter/verse fields, `Outcome<T>`
provenance, structural position, discovery registries). Every future schema change after
that needs a consistent way for a caller to know which schema shape a given result was built
against, so a consumer pinned to an older shape can detect drift instead of silently
misreading a renamed or restructured field.

## Decision

Export a `SCHEMA_VERSION` constant (SemVer string, independent of the npm package version)
and stamp `schemaVersion` on both branches of `GetResult` and on every `Outcome<T>` — so an
outcome extracted and stored/transmitted independently of the rest of the envelope stays
self-describing. Schema SemVer rules: a MAJOR bump for any field removal, rename, or type
change; MINOR for additive fields; PATCH for documentation-only or non-structural fixes. A
schema MAJOR bump does not require an npm MAJOR bump on its own, but v0.3's schema MAJOR bump
does coincide with a package MAJOR-equivalent pre-1.0 release, since it removes/renames
existing v0.2 fields.
_Rejected:_ `schemaVersion` only at the top level of `GetResult` (loses self-description for
an extracted `Outcome<T>`); no versioning at all until 1.0 (defers a problem that only gets
harder to retrofit once consumers exist).

## Consequences

Every `Outcome<T>` and `GetResult` branch carries `schemaVersion: string`, populated from the
same `SCHEMA_VERSION` constant everywhere (no per-adapter or per-concern drift — it describes
the library's schema, not the provider's data). Any future schema change updates
`SCHEMA_VERSION` per the SemVer rule above and documents the change in the migration guide.
Revisit if the schema and package version numbers need to be decoupled more formally (e.g. a
schema reaching 2.0 while the package is still pre-1.0) — not expected before 1.0.
