# ADR-0016 — Ayah, slot, and word alignment

- **Status:** accepted
- **Date:** 2026-08-13

## Context

Word counts and boundaries can differ between Quranic transmissions, while a canonical word
identifier must remain stable. A flat per-ayah word list tied to one transmission would force
canonical word ids to be renumbered when another transmission adds or drops a word. The schema
therefore needs an alignment representation consumers can inspect directly.

## Decision

Separate ayah, slot, and word. An ayah knows only its `startSlot` and `endSlot` boundaries. A
slot is a stable alignment coordinate in the base transmission's word sequence and resolves,
per transmission, to zero, one, or, rarely, more than one word. A word is the canonical,
transmission-agnostic textual/morphological unit with its own id and metadata. This preserves
canonical word ids when a transmission adds or drops a word relative to the base transmission,
Ḥafṣ ʿan ʿĀṣim.

Expose slots in the public schema rather than resolving them server-side into a flat word list:
`UnifiedVerse.slots` is `UnifiedWordSlot[]`, and each slot has a nested `words` array with
0/1/n entries. The slots field is the alignment sequence itself, deliberately allowing API
consumers to inspect the alignment structure as well as its resolved words.

Select the transmission through the already-approved `VerseQuery.edition` field using a small
stopgap map, rather than adding a new query field. An edition not present in that map defaults
to `hafs_an_asim`. v1 is the degenerate case: every slot's `words` array contains exactly one
entry, proving the mechanism while no real cross-transmission divergence data is available
(ADR-0015).

## Consequences

The public schema retains both ayah boundaries and the slot sequence, and future registries
must preserve the 0/1/n slot-to-word relationship instead of flattening it. Consumers choosing
an edition receive the map-selected transmission without a second query parameter. Revisit
the stopgap mapping when a canonical transmission registry and real divergence data are
available.
