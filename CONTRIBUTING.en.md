# Contributing to quran-api-unified

[العربية](./CONTRIBUTING.md) · **English**

Thanks for wanting to contribute. The most useful contributions are **new provider adapters**,
and this guide makes that path clear. Everything here follows the same workflow the maintainers
use: [`docs/workflow.md`](./docs/workflow.md).

## Local setup

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm pkg:check && pnpm docs:build
```

All of these must finish successfully (exit 0) before you start.

## The workflow

Every change — a new adapter, a core feature, a fix — follows the phases in
[`docs/workflow.md`](./docs/workflow.md): spec brief → branch → implement inner-layers-first →
colocated tests → local gates → Changeset → PR → release. Branch off `main` using the pattern
`ibrahim/<issue>-<slug>`.

## The adapter contract

An adapter is **pure and declarative**: it never fetches on its own, and never reads
`process.env`. It only describes the call:

1. a unique snake_case `id` and a display `name`;
2. a `capabilities` list of the content types it serves;
3. per content type: a `buildUrl(query, ctx)` that builds the URL and a `transform(raw, query,
   ctx)` **pure function** that maps the raw response to the unified shape, with `responseType`
   (`json` by default, `text` for raw-text sources) and `useProxy` if the source needs a proxy;
4. an `auth` marker for whether it needs credentials (`none` | `apiKey` | `oauth2-client`).

```ts
export interface Adapter {
  id: string                    // snake_case, unique, e.g. 'alquran_cloud'
  name: string
  capabilities: Capability[]    // 'text' | 'audio' | 'translation' | 'tafsir'
  auth?: 'none' | 'apiKey' | 'oauth2-client'
  text?: CapabilityHandler<VerseQuery, UnifiedVerse>
  audio?: CapabilityHandler<AudioQuery, UnifiedAudio>
  translation?: CapabilityHandler<TranslationQuery, UnifiedTranslation>
  tafsir?: CapabilityHandler<TafsirQuery, UnifiedTafsir>
}
```

The actual network call happens only in the fetch layer (`core/http.ts`); an adapter never
imports `core/http.ts`. This is the boundary the linter enforces.

## Add a new provider

1. Fetch the provider's current API docs, make one real call, and save the response under
   `test/fixtures/<id>/`.
2. Write the provider page `docs/providers/<id>.md` (and its English mirror
   `docs/en/providers/<id>.md` — a real subpath, not a `.en.md` suffix, so the site's `/en/`
   locale routing picks up the right language and text direction) from the template: base URL,
   endpoints, params, auth, rate limits, the raw response shape, **and why** the mapping is
   what it is.
3. Add `src/adapters/<id-kebab>.ts` implementing the port, and register it in
   `src/adapters/index.ts`.
4. Tests: test `transform` against the recorded fixture (correct mapping, malformed input) and
   `buildUrl` correctness; add the provider to the relevant mandatory-path integration tests.
5. Add a Changeset describing the addition.

## Credentialed adapters

By default the library is keyless. If a provider needs credentials, set `auth` to `apiKey` or
`oauth2-client`, read the credentials from `ctx.credentials` **only** (the caller passes them
keyed by provider id), and document the required keys in the provider page and in
`.env.example` (used only by the live-smoke suite). An adapter missing its credentials is
skipped in auto-selection, and throws only if requested explicitly by name.

## Testing your adapter

- `transform` is tested against the recorded fixtures with no network access.
- `buildUrl` is asserted for the reference, credentials, and proxy.
- The default suite (what CI runs) works offline; the live drift check is optional via
  `pnpm test:live`.

## Documentation expectations

- **TSDoc on every public export** — the API reference is generated from it.
- **Every adapter has its page** `docs/providers/<id>.md`; a PR that adds an adapter without
  its page will not be merged.
- If you change a structure or a name, update the affected docs in the same PR.

## Commits, changesets & PRs

- **Conventional Commits**, scope = the module most affected, e.g.
  `feat(adapters): add mp3quran audio adapter`, `fix(core): honor per-concern timeout`.
- Every user-facing change ships with a **Changeset** (`pnpm changeset`) at the right bump
  level (`feat`=MINOR, `fix`=PATCH; pre-1.0 breaking bumps MINOR).
- Merge by **squash**; the PR title is the commit and must be Conventional-Commits valid.
- Git hard rules: never `git add -A`, never commit `.env` or build artifacts, never
  `--no-verify`.

## License

By contributing you agree that your contributions are licensed under the project's
[MIT](./LICENSE) license.
