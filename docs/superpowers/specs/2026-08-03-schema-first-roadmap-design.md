# Schema-First Roadmap Design

**Status:** Design approved — ready for task-level implementation planning
**Planning phase:** Phase 1 complete (spec intake, clarification, and detailed design)
**Target horizon:** v0.3 through v0.5 for one maintainer

## Vision

`quran-api-unified` is a provider-agnostic TypeScript compatibility layer that gives Quran
APIs one stable developer schema. Providers remain interchangeable implementation details;
the canonical schema, typed results, partial-result behavior, and provenance form the product.

Preferred positioning:

> A provider-agnostic TypeScript library that gives every Quran API the same developer schema.

Avoid positioning the package as a hosted “universal Quran API” or as another data provider.

## Decisions approved on 2026-08-03

- Plan a feasible next-release sequence rather than a one-year or unconstrained roadmap.
- Lead v0.3 with the canonical schema, not provider growth or advanced fallback.
- Make v0.3 a deliberate pre-1.0 breaking redesign rather than preserving v0.2 shapes.
- Model the broad Quran domain: scripts, riwayat, reciters, translations, tafsirs, editions,
  surahs, ayahs, juz, hizb, rub al-hizb, and pages.
- Put compact canonical references in results and complete records in discovery registries.
- Use stable IDs and deterministic bilingual Arabic/English names in compact references.
- Export `SCHEMA_VERSION` and include `schemaVersion` in every `get()` result.
- Ship curated, static, offline registries first. A layered live-provider registry is future work.
- Add no providers in v0.3. Migrate and validate all existing adapters before expanding coverage.
- Deliver v0.3 incrementally: schema kernel, domain slices, adapter migration, discovery, docs.

## Approved v0.3 boundary

v0.3 is a canonical-domain-model release. It includes shared schema primitives, canonical
identifiers, bilingual resource references, provenance, curated registries, provider-ID
mappings, discovery APIs, migrated built-in adapters, validation, conformance tests, and a
v0.2-to-v0.3 migration guide.

Modeling structural resources does not add queries by juz, hizb, rub al-hizb, or page. It
only lets results represent those concepts consistently. New query granularities remain
separate features.

Provider-specific response bodies stay opt-in under `raw`. The unrestricted `meta` escape
hatch is narrowed in v0.3 (see "Terminology and renames" below) rather than removed outright.

## Terminology source: the Quranic terminology glossary

v0.3's naming work (this design's renames, and GitHub issue #5, "توحيد تسمية المصطلحات في
الـ API") is grounded in a community-maintained glossary of ~57 Quranic terms, each with an
Arabic form, a common English rendering (often a transliteration/loanword), a literal English
translation, and any alternative spellings in circulation. The glossary is vendored at
[`docs/glossary/quranic-terminology.json`](../../glossary/quranic-terminology.json) (source
link credited in the root README's "Credits" section) — a reference document only, never
imported by `src/` or shipped in the package.

**Renaming rule:** for a term already used in the public API, check the glossary's
alternative-spellings data.

- If the term has **no recorded alternative spelling**, keep the established transliteration
  as-is — it isn't the inconsistent-spelling problem this work targets, and it's a recognized
  term of art (e.g. `reciter`/`edition`, already plain English; a term kept as a loanword
  stays a loanword, not "Arabic in Latin letters" ambiguity).
- If the term **does** have a recorded alternative spelling (the `juz`/`juzu`-style problem),
  replace it with its literal English translation instead of trying to pick one canonical
  transliterated spelling — that eliminates the ambiguity outright rather than relocating it.

This is a data-driven rule, not a blanket "translate everything" or "keep everything"
policy — see the two conflicts it surfaced, resolved below.

## Result envelope and provenance (approved 2026-08-07)

`schemaVersion` is stamped both on the top-level `GetResult` (both branches) and on every
per-concern outcome, so an outcome extracted and stored/transmitted independently of the rest
of the envelope stays self-describing.

`Part<T>` is renamed to `Outcome<T>` (see "Terminology and renames" — freed up so `part` can
name the juz field without a confusing near-collision). `Provenance` replaces the flat
`source: string` field on `Outcome<T>`; the `Unified*` value types stay pure normalized data
with no envelope concerns, the same separation an HTTP response draws between headers and body.

```ts
export interface LocalizedName {
  readonly ar: string
  readonly en: string
}

export interface ResourceRef {
  readonly id: string
  readonly name: LocalizedName
}

export interface Provenance {
  readonly provider: ResourceRef
  readonly providerResourceId?: string
  readonly sourceUrl?: string
  readonly sourceVersion?: string
  readonly retrievedAt: string
}

export interface Outcome<T> {
  readonly ok: boolean
  readonly schemaVersion: string
  readonly value?: T
  readonly error?: QuranError
  readonly provenance?: Provenance
  readonly raw?: unknown
  readonly attempts: readonly Attempt[]
}

export type GetResult =
  | { readonly ok: true; readonly schemaVersion: string; readonly value: Composed
      readonly attempts: readonly Attempt[] }
  | { readonly ok: false; readonly schemaVersion: string; readonly error: QuranError
      readonly attempts: readonly Attempt[] }
```

`sourceUrl` and `retrievedAt` are captured by the client's `runAttempt` (the same place
`durationMs` is measured today) — never inside an adapter's `transform`, keeping the pure-
handler contract intact (no `Date.now()`, no I/O inside `transform`).

`sourceVersion` and `providerResourceId` are **trustworthy by construction, never guessed**:
`CapabilityHandler` gains two more optional pure extractor functions, alongside `buildUrl` /
`transform` / `headers`. An adapter implements one only when its provider genuinely exposes
that signal; otherwise it stays `undefined`.

```ts
export interface CapabilityHandler<Q, R> {
  readonly buildUrl: (q: Q, ctx: AdapterContext) => string
  readonly transform: (raw: unknown, q: Q, ctx: AdapterContext) => R
  readonly responseType?: ResponseType
  readonly useProxy?: boolean
  readonly headers?: (ctx: AdapterContext) => Record<string, string>
  readonly sourceVersion?: (raw: unknown, q: Q, ctx: AdapterContext) => string | undefined
  readonly providerResourceId?: (raw: unknown, q: Q, ctx: AdapterContext) => string | undefined
}
```

Populating these for a given adapter happens during that adapter's own v0.3 migration slice,
not as a day-one requirement across all six built-ins at once.

## Canonical identity (approved 2026-08-07)

**ID syntax:** flat, unprefixed `snake_case`, unique within its own registry — matching the
existing adapter-id convention (`alquran_cloud`, `quran_foundation`). No namespace prefix:
the field a canonical id sits in already carries its type (`AudioQuery.reciter: string` can
only ever be a reciter id), so `reciter:mishary_alafasy` would be redundant over
`mishary_alafasy`.

**Lifecycle / deprecation:** no soft-deprecation machinery in v0.3. Canonical ids are treated
as stable at curation time; a rename is an explicit, documented breaking change (CHANGELOG +
migration guide + schema-version bump), not a `deprecated`-flagged forwarding entry. Retired
ids are never reused for a different resource.

**Registry governance:** registries are curated static data files shipped with the package,
reviewed through normal PR review, with a conformance test asserting id uniqueness and
well-formedness per registry. No community-contribution process yet (that's v0.4's
"Community adapter policy" work item) and no runtime registration API for custom registry
entries in v0.3 — registries stay read-only and static, consistent with "no new providers in
v0.3" and "layered live-provider registry is future work."

## Text domain: script, transmission, and text editions (approved 2026-08-07)

Three distinct concepts were being conflated: **script** (رسم — the orthography a verse's
Arabic is rendered in, e.g. Uthmani vs. simplified/Imlaei), **transmission** — renamed from
"riwayah," see "Terminology and renames" (رواية — the recitation-transmission chain, e.g.
Hafs 'an 'Asim, Warsh 'an Nafi', affecting wording/diacritics and recitation), and a **text
edition**, the real-world publication that fixes one script + one transmission together (not
every combination has actually been published).

A caller selects via a single `edition` id, the same pattern translation and tafsir/exegesis
already use — not two independent `script`/`riwayah` fields — so a request can only name a
combination that was actually published; the registry is the source of valid pairs, not free
composition.

```ts
export interface VerseQuery extends Ref {
  readonly edition?: string // e.g. "hafs_uthmani"
}

// registries/text-editions.ts
interface TextEditionEntry extends ResourceRef {
  readonly script: ResourceRef // -> "uthmani"
  readonly transmission: ResourceRef // -> "hafs_an_asim"
}
```

`GetRequest` needs a new flat field for this, since top-level `edition` is already claimed by
the translation concern: `GetRequest.textEdition?: string`.

## Structural position (approved 2026-08-07)

Juz/hizb/rub-al-hizb boundaries are canonical constants — every standard mushaf agrees which
ayah starts which juz, independent of provider — so they're computed centrally from a static
lookup table keyed by `(chapter, verse)`, never asked of adapters. `page` is genuinely
edition-dependent (print layout varies by mushaf typesetting) and is **not** modeled this way
in v0.3; it stays deferred (see `UnifiedMeta` below) rather than silently picking one edition's
pagination as canonical.

Every verse-shaped result carries a `structure` object, always present, holding plain numbers
— not full bilingual `ResourceRef` records, which would otherwise repeat the same static
name strings on every one of 6,236 verses. A consumer wanting the full record for a given
part/group/quarter looks it up once via discovery.

```ts
export interface UnifiedVerse {
  readonly key: string
  readonly chapter: number
  readonly verse: number
  readonly structure: {
    readonly part: number
    readonly group: number
    readonly quarter: number
  }
  readonly text: string
  readonly meta?: UnifiedMeta
}
```

## Discovery API (approved 2026-08-07)

v0.3 adds discovery for roughly six more registries beyond the existing `listAdapters()`
(scripts, transmissions, reciters, translation editions, exegesis editions, text editions).
Rather than flattening six-plus new `listX` methods onto `QuranClient` alongside
`get`/`registerAdapter`, they group under one `discover` namespace — `QuranClient`'s primary
surface stays as small as it is today, and the discovery surface grows in its own place. Each
method is fully typed (not one generic `discover(type, filter)` dispatcher) and returns the
full curated record — richer than the compact `ResourceRef` embedded in results — with an
optional resource-specific filter.

```ts
export interface QuranClient {
  get(req: GetRequest): Promise<GetResult>
  listAdapters(capability?: Capability): readonly Adapter[]
  registerAdapter(adapter: Adapter): QuranClient
  readonly discover: {
    scripts(): readonly ScriptEntry[]
    transmissions(): readonly TransmissionEntry[]
    reciters(filter?: { transmission?: string }): readonly ReciterEntry[]
    translationEditions(filter?: { language?: string }): readonly TranslationEditionEntry[]
    exegesisEditions(filter?: { language?: string }): readonly ExegesisEditionEntry[]
    textEditions(filter?: { script?: string; transmission?: string }): readonly TextEditionEntry[]
  }
}
```

## Terminology and renames (approved 2026-08-07)

Full v0.2 → v0.3 rename table, produced by applying the glossary rule above:

| v0.2 | v0.3 | Why |
| --- | --- | --- |
| `Ref.surah`, `Unified*.surah` | `.chapter` | Surah/Sura → alt spelling recorded → convert |
| `Ref.ayah`, `Unified*.ayah` | `.verse` | Ayah/Aya → alt spelling recorded → convert |
| `UnifiedMeta.juz` | `structure.part` | Juz/Juzu → alt spelling recorded → convert |
| — (new in v0.3) | `structure.group` (hizb) | Hizb/Hezb → alt spelling recorded → convert |
| — (new in v0.3) | `structure.quarter` (rub al-hizb) | Rub al-Hizb / Rub' al-Hizb / Rub el Hizb → convert |
| `TafsirQuery`, `UnifiedTafsir`, `tafsirId`, `Capability` `'tafsir'`, `Adapter.tafsir` | `ExegesisQuery`, `UnifiedExegesis`, `exegesisId`, `'exegesis'`, `Adapter.exegesis` | Tafsir/Tafseer → alt spelling recorded → convert |
| `riwayah` (introduced in this design, not yet shipped) | `transmission` | Riwayah/Riwaya → alt spelling recorded → convert |
| `Part<T>` (`core/result.ts`) | `Outcome<T>` | not a Quranic term — renamed only to free `part` for juz without a confusing near-collision |
| `reciter` (`AudioQuery.reciter`, `GetRequest.reciter`) | unchanged | Qari/Qaari has an alt spelling too, but the code already uses the literal English word, not the transliteration — already compliant |
| `edition` (`TranslationQuery.edition`, `GetRequest.edition`) | unchanged | never a transliteration to begin with |
| `UnifiedMeta` | kept, narrowed | drops the unrestricted `[key: string]: unknown` index now that `juz` has a real home in `structure`; keeps `page` until it has a principled (edition-scoped) home |

The `tafsir` → `exegesis` rename ripples through the whole capability: the `Capability` union
member, `Adapter.tafsir` (→ `Adapter.exegesis`), `ComposeInput.tafsir` (→ `.exegesis`),
`GetRequest.tafsirId` (→ `.exegesisId`), and `Composed.tafsir` (→ `.exegesis`) all follow the
same rename for consistency — the capability, its query, its result type, and its request
field must not disagree with each other.

`riwayah`/`transmission` did not exist in the shipped v0.2 API; it's new in this design's text-
domain work, so there's no prior name to migrate away from — it ships already renamed.

## Proposed schema foundations

The concrete types above are the proposed v0.3 kernel: `LocalizedName`, `ResourceRef`,
`Provenance`, `Outcome<T>`, `GetResult`, the renamed `Unified*` fields plus `structure`, and
the `discover` namespace. Registry entry shapes for scripts, transmissions, reciters,
translation/exegesis/text editions, and the surah/juz/hizb/rub-al-hizb structural registry
itself are detailed at the task-plan level, not enumerated further here.

## Delivery approach

```text
Schema rules and primitives
          ↓
Canonical resource registries
          ↓
Concern-specific result schemas
          ↓
Existing adapter migrations
          ↓
Discovery API and validation
          ↓
Migration guide and v0.3 release
```

Each domain slice must include its types, curated records, provider mappings, validation,
adapter changes, conformance tests, Arabic-primary documentation, English mirror, and a
Changeset. Implementation follows `docs/workflow.md` and starts only after design approval.

## Living backlog

Statuses: **Done**, **Partial**, **Next**, **Later**, **Deferred**.

### Current product baseline (v0.2.0)

| Status | Capability | Current state / remaining work |
| --- | --- | --- |
| Done | Typed results and partial results | Provider failures are data; concern-level attempts are retained. |
| Done | Ordered per-concern fallback | Deterministic selection with explicit source overrides. |
| Done | Timeouts | Configurable request timeout exists in the HTTP boundary. |
| Done | Runtime provenance basics | Successful parts identify `source`; attempts can expose duration. |
| Done | Opt-in raw response | `includeRaw` exposes the winning provider body. |
| Done | Custom adapters | `registerAdapter()` and `listAdapters()` are public. |
| Done | Credentials and OAuth2 | Per-provider credentials and Quran Foundation client credentials exist. |
| Done | Optional Zod entry | Validation is available through the optional `./zod` entry. |
| Done | Provider baseline | Quran Foundation, Al Quran Cloud, QuranHub, Quran API Edge, Quran Finder, and spa5k tafsir are built in. |
| Done (design) | Canonical schema | Result envelope, provenance, canonical identity, text domain, structural position, discovery API, and the full terminology rename table are approved above; implementation is the next phase. |
| Done (design) | Discovery | `client.discover.*` namespace and method shapes are approved above; implementation is the next phase. |
| Partial | Observability | Attempt duration and errors exist; no health model, event/logger contract, or stable diagnostic taxonomy. |
| Partial | Provider testing | Fixture and integration tests exist; systematic drift detection and full contract matrices remain. |

### v0.3 — Canonical schema and registry

| Order | Work item | Acceptance outcome |
| --- | --- | --- |
| 1 | Schema compatibility ADR | Defines schema SemVer, `SCHEMA_VERSION`, breaking-change rules, and response-version placement (envelope shape approved above). |
| 2 | Canonical identity ADR | Defines stable ID syntax, lifecycle, and registry governance (approved above). |
| 3 | Provenance ADR | Defines provider, upstream resource ID, source URL/version, retrieval time, and optionality (approved above). |
| 4 | Schema kernel | Implements `LocalizedName`, `ResourceRef`, `Provenance`, `Outcome<T>`, `GetResult`, and the renamed `Unified*`/`structure` shapes. |
| 5 | Quran structure registry | Curates chapters, verses, parts (juz), groups (hizb), quarters (rub al-hizb), and their validated relationships. |
| 6 | Text domain | Defines text editions, scripts, transmissions, verse text, and mappings for existing text adapters. |
| 7 | Audio domain | Defines reciters, recitations, audio scope/format, and mappings for existing audio adapters. |
| 8 | Translation domain | Defines canonical translation works/editions and maps provider edition IDs. |
| 9 | Exegesis domain | Defines canonical exegesis (tafsir) works/editions and maps provider tafsir IDs. |
| 10 | Discovery API | Implements `client.discover.*` per the shape approved above. |
| 11 | Adapter migration | Every built-in adapter emits only the new schema and passes the same conformance suite. |
| 12 | Validation migration | The optional Zod entry mirrors every public schema and proves type/schema parity. |
| 13 | Contract and conformance tests | Covers canonical IDs, mappings, provenance, cross-provider equivalence, and invalid registry data. |
| 14 | Migration and product docs | Ships native Arabic docs plus English mirrors for the new model and v0.2 migration, including the full rename table above. |
| 15 | Release verification | All local gates, bundle smoke, live provider smoke, Changeset, and published-package checks pass. |

### v0.4 — Provider coverage and adapter ecosystem

| Priority | Work item | Notes |
| --- | --- | --- |
| 1 | Provider evaluation matrix | Score official status, stability, licensing, auth, CORS, rate limits, capabilities, and canonical mapping coverage. |
| 2 | UmmahAPI adapter | Add only after current upstream documentation and fixture capture. |
| 3 | GlobalQuran adapter | Add only after licensing, stability, and response-shape validation. |
| 4 | Additional audio/translation/exegesis coverage | Choose providers by missing canonical resources, not raw provider count. |
| 5 | Quranic Universal Library evaluation | Integrate only when its API/contract is stable and it adds distinct coverage. |
| 6 | Adapter authoring kit | Contract tests, fixtures, bilingual provider-doc template, ID-mapping checks, and contribution workflow. |
| 7 | Community adapter policy | Establish ownership, quality gates, deprecation, security, and compatibility expectations. |

Quran Foundation, Al Quran Cloud, and QuranHub are already present; v0.4 should improve their
canonical coverage rather than list them as new-provider work.

### v0.5 — Reliability and operational insight

| Order | Work item | Dependency / constraint |
| --- | --- | --- |
| 1 | Retry policy | Retry only transient, idempotent failures; define budgets and backoff through an ADR. |
| 2 | Provider health model | Inject time, keep core selection pure, and define scope/lifetime of observations. |
| 3 | Circuit breaker | Build on the health model; avoid hidden global mutable state. |
| 4 | Weighted selection | Add a pluggable policy while retaining deterministic ordered fallback. |
| 5 | Semantic fallback | Rank only resources proven equivalent by canonical script, transmission, work, and edition IDs. |
| 6 | Observability hooks | Structured injected events/logger for winner, latency, fallback reason, and health transitions; remain silent by default. |
| 7 | Automatic benchmarking | Opt-in tooling, not selection behavior, until measurements are representative. |

### Later initiatives

- Cache port followed by memory and browser-safe implementations.
- Redis and filesystem adapters as optional packages only after package-boundary design.
- Layered runtime discovery merging curated and provider-derived registry records.
- Queries by juz (part), page, hizb (group), rub al-hizb (quarter), and batch/range APIs.
- Offline/local JSON adapters.
- Search, streaming, and browser-specific caching only with demonstrated use cases.
- Package splitting only when independent release, dependency, or bundle-size needs justify it.
- Plugin packaging beyond the existing custom-adapter contract only if community adapters need it.
- A principled, edition-scoped home for `page` (mushaf pagination varies by print layout).

## Explicit deferrals and cautions

- Do not split into `@quran-api-unified/*` packages during v0.3. That adds release and version
  coordination without improving the schema itself.
- Do not implement Redis, IndexedDB, filesystem, and Browser Cache simultaneously. First
  approve a cache port and prove it with one in-memory implementation.
- Do not call all fallback “semantic.” Equivalence must be established through canonical IDs;
  otherwise fallback can silently change Quran script, transmission, translation, or exegesis.
- Do not optimize for provider count. Track canonical resource coverage and adapter health.
- “Zero breaking schema changes” is not realistic before 1.0. Track intentional compatibility,
  documented migrations, and no unplanned breaking changes instead.

## Proposed success metrics

- Percentage of built-in adapter outputs passing the shared schema conformance suite: target 100%.
- Percentage of provider resource IDs mapped to reviewed canonical IDs for supported calls.
- Number of fallback paths proven semantically equivalent through canonical mappings.
- Published-package success across ESM, CJS, TypeScript, browser bundle, and Deno or Bun.
- Median time and files required to add a conforming provider adapter after v0.4 tooling.
- Number of applications that change provider preference without changing result-handling code.
- Unplanned breaking schema changes: target zero; intentional changes follow schema SemVer.

## Next step

All eight questions from the previous session are resolved (envelope, provenance, canonical
ID syntax and lifecycle, text-domain separation, structural position, discovery API, and the
full terminology rename table). The remaining step is converting this design into GitHub
issues and a task-level implementation plan under `docs/superpowers/plans/`, per the
`writing-plans` skill — not yet started.

## Approval gate

The vision, release boundary, high-level foundations, delivery approach, result envelope,
provenance contract, canonical identity, text domain, structural position, discovery API, and
terminology rename table are all approved. Implementation has not started. Next: write the
task-level plan and create/link GitHub issues.
