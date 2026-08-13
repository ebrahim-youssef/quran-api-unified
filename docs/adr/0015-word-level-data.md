# ADR-0015 — Word-level data: source, scope, and provenance

- **Status:** amended (see Amendment below) — root/lemma sourcing blocked
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

## Amendment (2026-08-14) — the QUL-avoids-the-Corpus's-GPL premise does not hold for root/lemma

Task 5c's Step 1 license check (the "required manual step, not an assumption" mandated above)
found that this ADR's rejection of the Quranic Arabic Corpus does not actually clear QUL as a
substitute for the **root/lemma/morphology** portion of the v1 field list:

- QUL's own `/credits` page attributes its morphology/root/lemma data to **Dr. Kais Dukes**
  ("preparing the original digitized Quran morphology data") and Mustafa Jibaly — Kais Dukes
  is the creator of the Quranic Arabic Corpus, the exact source rejected above. No page on
  qul.tarteel.ai (resource detail pages, FAQ, credits) states a separate relicensing or
  redistribution grant for this dataset distinct from the Corpus's own terms.
- Checking the Corpus directly (corpus.quran.com) instead of via QUL was also considered, as a
  possible way to get the data under a narrower "terms of use" rather than full GPL. It is not:
  the download page states "By downloading this data, you agree to the terms and conditions of
  the GNU License," and the data file's own embedded header reads, verbatim:

  ```
  # Copyright (C) 2011 Kais Dukes
  # License: GNU General Public License
  #
  # TERMS OF USE:
  # - Permission is granted to copy and distribute verbatim copies
  #   of this file, but CHANGING IT IS NOT ALLOWED.
  # - This annotation can be used in any website or application,
  #   provided its source (the Quranic Arabic Corpus) is clearly
  #   indicated, and a link is made to http://corpus.quran.com...
  # - This copyright notice shall be included in all verbatim copies
  #   of the text, and shall be reproduced appropriately in all works
  #   derived from or containing substantial portion of this file.
  ```

  The attribution/link-back clause is layered on top of GPL, not a substitute for it, and the
  "verbatim copies... CHANGING IT IS NOT ALLOWED" restriction directly conflicts with what
  Task 5c would do (extract and re-encode the data as `registries/words.ts` TypeScript
  objects) — the notice's own "derived from or containing substantial portion of this file"
  clause anticipates exactly that transformation and still requires it stay under the Corpus's
  terms.

- **`root` and `lemma` are therefore blocked for v1**, sourced from either QUL or
  corpus.quran.com, pending either a suitably licensed alternative source or an explicit
  relicensing confirmation obtained directly from Tarteel/QUL (Ibrahim is pursuing the latter
  separately; this ADR does not assume its outcome).
- The **`text`/`transliteration`/`translation` (gloss)** word-by-word resource is a separate
  case: QUL credits it to QuranWBW.com, and no Kais-Dukes/Corpus/GPL attribution was found for
  that resource specifically. Its license text still needs the same verbatim-record treatment
  before Task 5c ships it, per the original Decision above, but it is not blocked by this
  finding.

This amendment does not itself decide Task 5c's revised scope (e.g., whether to ship v1 with
`root`/`lemma` omitted) — that is recorded wherever Task 5c's own scope is finalized, not here.
