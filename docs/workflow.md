# The Dev Loop — idea → published release (8 phases)

The master loop for this library. Follow it for EVERY change — a new adapter, a core feature,
a fix. No shortcuts, no reordering. This library has no staging/production URLs; its "deploy"
is a **release to npm**, and its "does it work" check runs in a *consumer's* project.

---

## Session startup (top of every session, before touching code)

1. Read `AGENTS.md`.
2. Ask which ticket/change this session is for.
3. Read the ADR(s) relevant to the layers this ticket touches.
4. `git status` + `git log --oneline -10` — understand branch state.
5. State which phase the work is entering (fresh / continuing / finishing).

## Phase 0 — Bootstrap (one-time only)

Run the stack bootstrap sequence (`docs/stack.md` §1). Create the folder skeleton
(`src/{core,ports,adapters,validation}`, `test/{fixtures,helpers}`, `docs/`) and the
import-boundary lint rules; **verify the boundary** by committing one deliberate bad import
(an adapter importing `core/http.ts`) and watching lint fail. Configure `tsup` (dual
ESM+CJS+dts, the `.` and `./zod` entries), the `exports` map, Changesets, and VitePress
(`ar` default + `en`). Skeleton must be fully green before any feature work:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm pkg:check && pnpm docs:build
```

## Phase 1 — Spec intake & clarification

Before coding, answer ALL of: (1) what exactly it does — acceptance criteria, one verifiable
sentence each; (2) which GitHub issue (#N — existing, or flag one must be created); (3) which
layers it touches; (4) does it conflict with a locked ADR (adapter contract, error style,
selection strategy)? if yes → conversation, not code; (5) any open design question → write a
new ADR first. Output a short brief; **STOP and get user confirmation before Phase 2.**

## Phase 2 — Branch & task planning

1. Branch `ibrahim/<issue>-<slug>` cut from `main` (trunk-based; short-lived).
2. Task list in dependency order — inner layers first:
   **schema/result/types → ports → adapters (buildUrl + pure transform) → core (select,
   compose, http) → client → optional zod entry → docs.**
3. For each layer touched, add its test task from the test matrix (`docs/stack.md` §8).
4. **Adding a provider adapter?** the tasks are fixed: fetch upstream docs → save a real
   response as a fixture → write `docs/providers/<id>.md` (+ `docs/en/providers/<id>.md`) →
   implement + register the adapter → transform/buildUrl tests → wire into the mandatory-path
   integration tests.
5. Add a **Changeset** task (describe the change + its SemVer bump).

## Phase 3 — Implementation (layer by layer)

Never start a layer before the one it depends on type-checks clean. Cross-cutting rules:
strict types (no `any` on the public surface), **TSDoc on every public export**, no
`console.*` (the library is silent; diagnostics ride the typed result or the injected logger),
no magic values, no dead code, reuse-before-create, **keep `core` dependency-free**, and
**fetch the provider's current API docs before writing an adapter**.

## Phase 4 — Testing (colocated)

Tests ship in the same PR. Follow the test matrix (`docs/stack.md` §8). Mandatory test paths
(must always have a test when touched): **provider-fallback · partial-results ·
credentialed-adapter · custom-adapter (`registerAdapter`) · dual-consumption of the built
artifact**. Use the injected fake `fetch` + fixtures — no network-mock library, no live calls
in the default suite.

## Phase 5 — Quality gates (local, before any push)

**5a — Automated** (all exit 0):

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm pkg:check && pnpm docs:build
```

**5b — Build-and-consume verification.** `pnpm smoke:bundle` (import the built artifact as
ESM, CJS, and resolve types; drive the browser bundle via Playwright), then run a real
`examples/…` script that calls the changed path and prints the unified result. For a new
adapter, run `pnpm test:live` once against that provider to confirm the fixture still matches.

**5c — Manual checks.** Touched core or an adapter? a test file must be in the diff. Changed
structure/naming/behavior? update `CONVENTIONS.md` / `docs/architecture.md` / the provider doc
in the same PR. Is there a **Changeset** in the diff? if not, add one. Never `--no-verify`.

## Phase 6 — Changeset, commit & push

1. `pnpm changeset` describing the change + bump level (feat=MINOR, fix/perf/refactor=PATCH,
   docs/test/chore=none; pre-1.0: breaking bumps MINOR). Do **not** hand-edit the version.
2. Stage specific files (never `git add -A`; never `.env`/artifacts).
3. Conventional commit: `type(scope): imperative` + body (why + `#issue`). Scope = module most
   affected (`feat(adapters): …`, `fix(core): …`).
4. Push.

## Phase 7 — Pull request (feature → main)

1. PR body: What / Why (issue + ADR) / acceptance criteria as checkboxes / layers touched /
   test coverage / how to verify.
2. Wait for ALL CI green: **lint · typecheck · test · build · package-validate ·
   bundle-runtime-smoke · colocated-test-check · docs-build**.
3. Self-review the full diff once, hunting bugs only.
4. Squash-merge; PR title = the commit, Conventional-Commits valid. Delete the branch.

## Phase 8 — Release (Changesets → npm)

1. Merged PRs accumulate changesets on `main`; the Changesets bot keeps a **"Version
   Packages" PR** open that bumps SemVer and writes `CHANGELOG.md`.
2. Review + merge it → CI runs `changeset publish` → npm release (`latest`) with provenance.
   Pre-releases go out under `next`.
3. **Post-publish verify:** in a clean scratch project, install the *published* version and
   run the success check (below). Confirm the docs site deployed.
4. Mark the issue done; add newly discovered work as new backlog rows.
5. Not done until step 3 passes.

**Success check:** `npm i quran-api-unified` imports as ESM + CJS + types; `get({ ref:{surah:1,
ayah:1}, include:['text','audio','translation','tafsir'] })` returns all four concerns from
live providers; forcing the primary provider to fail still returns via fallback; an explicit
source returns from that source; a credentialed provider is skipped without creds; the same
call runs in Node, a browser bundle, and Deno/Bun.

---

## Hard stops (fix root cause, never work around)

- Open design question with no ADR → write the ADR first
- Any CI check red → fix before merge
- Core-layer or adapter change without a test in the diff → write the test first
- I/O in pure logic (an adapter or `core/{compose,select}` importing `core/http.ts`) → refactor
- A runtime dependency added to `dependencies` (core must stay dependency-free) → move to
  peer/optional or remove
- A public export without a TSDoc block → document it first
- A new adapter without its `docs/providers/<id>.md` + fixture → author them first
- `console.*` in committed code → remove first
- No Changeset for a user-facing change → add one first
- `git add -A` → stage specific files instead
