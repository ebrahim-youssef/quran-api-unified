# ADR-0013 — Canonical identity: ID syntax, lifecycle, and registry governance

- **Status:** accepted
- **Date:** 2026-08-07

## Context

v0.3 introduces curated registries (scripts, transmissions, reciters, translation/exegesis
editions, text editions, and later the structural registry). Every entry needs a stable `id`
string, a policy for what happens when an entry turns out to need renaming, and a policy for
who can add entries.

## Decision

**ID syntax:** flat, unprefixed `snake_case`, unique within its own registry — matching the
existing adapter-id convention (`alquran_cloud`, `quran_foundation`). No namespace prefix:
the field a canonical id sits in already carries its type (`AudioQuery.reciter: string` can
only ever be a reciter id), so a `reciter:` prefix would be redundant.

**Lifecycle:** no soft-deprecation machinery. Canonical ids are stable at curation time; a
rename is an explicit, documented breaking change (CHANGELOG + migration guide + schema
version bump), not a `deprecated`-flagged forwarding entry. A retired id is never reused for a
different resource.

**Registry governance:** registries are curated static data files shipped with the package,
reviewed through normal PR review. A conformance test asserts id uniqueness and
well-formedness (matches `^[a-z][a-z0-9_]*$`) per registry. No community-contribution process
and no runtime registration API for custom registry entries in v0.3 — registries stay
read-only and static, consistent with "no new providers in v0.3."
_Rejected:_ namespaced `type:slug` ids (redundant with the field's own type); a `deprecated`
metadata field with a compatibility window (adds forwarding-logic complexity before any real
rename has ever happened); open registry-extension API in v0.3 (out of scope until a
layered/live registry is designed).

## Consequences

Every registry entry (`ResourceRef`-shaped or richer) has a flat `id: string` unique within
its registry. Adding an entry is an additive (MINOR) schema change; renaming or removing one
is a documented breaking (MAJOR) change under ADR-0012's versioning rule. Each registry's
conformance test fails the build on a duplicate or malformed id. Revisit if community adapter
contributions (v0.4) need a registration path, or if a real rename happens and a soft
transition window turns out to matter in practice.
