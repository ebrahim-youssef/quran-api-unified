# ADR-0015 — Word-level data: source, scope, and provenance

- **Status:** accepted
- **Date:** 2026-08-13

## Context

The unified schema needs per-word text and morphology without making a consuming app depend
on an unverified or incompatible data source. QUL (<https://qul.tarteel.ai>), maintained by
Tarteel AI / Quran.com Foundation, provides the needed data through separate word-by-word
text/transliteration/gloss and morphology/root resources. QUL's codebase is MIT-licensed, but
that code license does not establish the license of either dataset.

## Decision

Seed word data from those two QUL resources. Before Task 5c ships real data, read and record
the per-resource dataset license text verbatim; this is a required manual step, not an
assumption, and is distinct from QUL's MIT code license.

v1 stores `text`, `transliteration`, `translation` (a gloss), `root`, and `lemma` for each
word. I'rab / grammatical-case analysis is out of scope; terminology follows
`docs/glossary/quranic-terminology.json`. The initial registry covers Surah Al-Fatihah only
(29 words) and only the Ḥafṣ ʿan ʿĀṣim transmission: QUL's morphology export is itself
Ḥafṣ/Uthmani-specific, so there is no honest source yet for real root/lemma data for a second
transmission such as Warsh.

`UnifiedVerse` gains field-scoped `wordsProvenance`, reusing `Provenance` from
`src/core/identity.ts` (ADR-0014), populated once and statically from the registry.
`wordsProvenance` identifies where the static word-data registry came from; it is distinct
from `Outcome.provenance`, which identifies the adapter that served an outcome.

_Rejected:_ Quranic Arabic Corpus (GPL-style terms conflict with this package's MIT license).
_Rejected:_ a hand-authored dataset (uncredentialed and lower quality).

## Consequences

This is an additive schema change: no existing field changes, so it follows ADR-0012's MINOR
schema-version rule. The registry must retain enough source information to populate its static
provenance, and real bundled data cannot ship until the required dataset-license record is in
place. Revisit when a suitably licensed, credentialed source supplies equivalent data for
another transmission or when v1 needs fields beyond its defined word scope.
