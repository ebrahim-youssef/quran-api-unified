# ADR-0011 — Restore the docs-only GitHub Actions workflow

- **Status:** accepted
- **Date:** 2026-07-26

## Context

ADR-0009 removed all four GitHub Actions workflows (`ci`, `release`, `docs`, `live-smoke`) in
favor of a manual CLI release, explicitly leaving the door open to "re-adding the workflows
from git history... whenever automation is wanted again." GitHub Pages was already configured
for this repo with `build_type: workflow` (Settings → Pages → Source: GitHub Actions) from the
original setup, so without a workflow to run, the published site can no longer update.

## Decision

Restore only `.github/workflows/docs.yml` (byte-identical to the version removed in
`0b08666`, since it was already proven end-to-end per ADR-0009): on push to `main`, build the
VitePress site and deploy it to GitHub Pages via `actions/deploy-pages`. `ci.yml`,
`release.yml`, and `live-smoke.yml` stay removed — local gates before merge (per
`docs/workflow.md` Phase 5) and the manual `changeset version` → `build` → `npm publish`
sequence (ADR-0009) are unchanged.
_Rejected:_ restoring all four workflows (reverses ADR-0009 wholesale, not what was asked);
a scheduled/cron docs rebuild (no content changes independently of a push to `main`, so
nothing to rebuild between merges).

## Consequences

Every merge to `main` now auto-deploys the docs site; a broken `docs:build` on `main` shows up
as a failed Action run (the local gate is still the only thing preventing a broken build from
reaching `main` in the first place — this workflow deploys, it does not gate). No change to
how the package itself ships.
