# ADR-0009 — Manual npm CLI release for now (supersedes the automation half of ADR-0008)

- **Status:** accepted
- **Date:** 2026-07-23

## Context

ADR-0008 wired GitHub Actions CI plus a Changesets-driven OIDC trusted-publish release. The
pipeline was proven end-to-end (CI green, the Version Packages PR opened and merged, a docs
site deployed), but the maintainer chose to publish the seed version directly via the npm CLI
and asked to remove the GitHub Actions workflows for now, with releases done from the CLI
instead.

## Decision

Remove `.github/workflows/{ci,release,docs,live-smoke}.yml` and the CI-only `.npmrc`
provenance flag. Contributors still add a **Changeset** per user-facing change (unchanged —
`pnpm changeset`) and still run the local gates before merging
(`pnpm lint && typecheck && test && build && pkg:check && docs:build`, per
`docs/workflow.md` Phase 5). Cutting a release becomes a **manual CLI sequence** run by the
maintainer: `pnpm changeset version` (consumes changesets, bumps SemVer, writes
`CHANGELOG.md`) → `pnpm build` → `npm publish --access public` (npm CLI ≥11.5, logged in
locally). Branching, trunk-based flow, and per-ticket PRs (ADR-0008) are unchanged.
_Rejected:_ leaving the workflows in place but disabled (dead YAML invites drift); deleting
ADR-0008 outright (the record of why CI/OIDC was built stays useful if automation returns).

## Consequences

No CI enforcement exists right now — the local gate run before each merge is the only quality
gate, so it must not be skipped. `.d.ts`/dual-format correctness (`pkg:check`) and the docs
build must be checked by hand before every release. This is explicitly a **for-now** state:
re-adding the workflows from git history (they were removed, not designed away) is a small,
reversible follow-up whenever automation is wanted again.
