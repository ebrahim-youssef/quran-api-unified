# ADR-0015 — Word-level data: source, scope, and provenance

- **Status:** amended (see Amendments below) — all v1 word data sourcing deferred
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

## Amendment 1 (2026-08-14) — the QUL-avoids-the-Corpus's-GPL premise does not hold for root/lemma

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
  that resource specifically. At the time this amendment was first written, it looked
  unaffected by the finding above — see Amendment 2, which supersedes that reading.
- Two other candidates were checked and ruled out for either portion of the field list:
  `mustafa0x/quran-morphology` (GitHub) describes itself in its own README as "a fork of
  Quranic Arabic Corpus Morphology v0.4" — same GPL lineage, not an alternative. The Quran
  Foundation's official API (`api-docs.quran.foundation`) is proprietary and explicitly bars
  the redistribution this package would need: its Developer Terms of Service state QF Content
  "is not resold, sublicensed, or redistributed except as integral to the end-user experience,"
  cap cached storage at one week absent a separate written agreement, and require a "separate
  written agreement with QF" for commercial redistribution — disqualifying, regardless of which
  word-data field is being sourced from it.

## Amendment 2 (2026-08-14) — QuranWBW also has no independent open data license; all v1 word data is deferred

Amendment 1 left the `text`/`transliteration`/`translation` (gloss) resource provisionally
clear, pending the same verbatim-license-record step applied to root/lemma. That step found the
same dead end:

- QuranWBW's frontend/marketing repo (`github.com/marwan/quranwbw.com`) is MIT-licensed
  (confirmed via the GitHub API), but that license covers only the SvelteKit site, not the
  word-by-word dataset.
- The actual data-serving repo (`github.com/marwan/quranwbw`, no ".com") states, in its "Our
  Data" README section, verbatim: "QuranWBW uses its very own data to give you that awesome
  word-by-word experience... If you're looking for Quranic data for your own projects, a great
  place to start is the Quranic Universal Library (QUL). It's a cool spot with lots of data! But
  if QUL doesn't have what you need, or you're curious about our data, just get in touch." The
  same README confirms the dataset itself lives on a private CDN (`static.quranwbw.com`),
  outside either repo, served as pre-generated static JSON rather than through any public API.
- QuranWBW's own maintainer therefore routes external data requesters back to QUL — the source
  already blocked by Amendment 1 — or to an ungranted, ask-permission-first private channel.
  There is no independent open license on offer for this dataset either.

Every source checked for any v1 word-data field (QUL, the Quranic Arabic Corpus directly,
`mustafa0x/quran-morphology`, the Quran Foundation API, QuranWBW) either carries the Corpus's
GPL v3 terms or declines to grant redistribution rights. A hand-authored/uncredentialed
alternative (the Itqan/CAMeL-Tools root-lemma dataset, MIT-licensed but single-author with a
hand-patched alias-map step) was identified and considered but not adopted, consistent with
this ADR's existing rejection of "a hand-authored dataset" above.

**Decision:** defer all of Task 5c's real word/slot data — `text`, `transliteration`,
`translation`, `root`, and `lemma` alike — rather than shipping any of it in v1. QUL itself is
tagged backlog/unresolved for this purpose: not in use as a data source until either a
relicensing confirmation is obtained directly from Tarteel/QUL (pursued separately, outside
this package's scope) or a differently-sourced, suitably licensed and credentialed dataset is
found.

**What is unaffected:** ADR-0016 (the ayah/slot/word alignment architecture) and the Task 5b
types (`UnifiedWord`, `UnifiedWordSlot`, and `UnifiedVerse`'s four optional `slots` /
`startSlot` / `endSlot` / `wordsProvenance` fields, already committed) stand as shipped. All
four fields are optional, so nothing breaks by them going unpopulated — only the registries that
would populate them (`registries/words.ts`, `registries/word-alignment.ts`, Task 5c) and the
code that would consume them (`client.ts` word enrichment, Task 10a) are deferred pending this
decision. Revisit per the original Decision's revisit condition above: a suitably licensed,
credentialed source for the deferred fields, for either the base transmission or another one
such as Warsh.
