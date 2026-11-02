# Contributing

Thanks for looking. This project is small on purpose: a zero-dependency
TypeScript library that rebuilds a page with a swarm of cursors.

## Setup

```bash
npm install          # installs deps and the git hooks
npm run build
npm run demo         # serves the demo pages on a Vite server
```

Node 24 or newer. The CI runs Node 26.

## Scripts

| Command                    | What it does                                   |
| -------------------------- | ---------------------------------------------- |
| `npm run typecheck`        | `tsc --noEmit`                                 |
| `npm run build`            | bundle with tsup, emit types                   |
| `npm run api-report`       | regenerate `api-report.md` from the public API |
| `npm run api-report:check` | fail if `api-report.md` is stale               |
| `npm run test:e2e`         | Playwright suite (Chromium)                    |
| `npm run format`           | Prettier on `src` and the demo pages           |

## Ground rules

- **No runtime dependency.** The package ships with none, and the bundle
  budget is part of the pitch. A new dependency needs a very good reason.
- **Strict TypeScript.** No `any`, no non-null assertion used as a shortcut.
  `npm run typecheck` must pass.
- **The public API is typed and reported.** If you touch `src/index.ts`, run
  `npm run api-report` and commit the result. A breaking change means a minor
  bump while the project is in `0.x`.
- **Visual changes need proof.** Attach a screenshot or a short clip to the PR.
  Do not commit the media.
- **The demo pages are the fixtures.** `demo/` is what the e2e suite drives;
  keep them working.

## Commits and branches

Conventional Commits, one intent per commit:

```
feat(demo): add a magazine layout
fix(snapshot): keep sticky boxes on screen
refactor(core): extract item geometry
```

Branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`.

## Pull requests

Fill the template. The checklist mirrors the CI:

```bash
npm run typecheck
npm run format:check
npm run build && npm run api-report:check
npm run test:e2e
```

Keep the diff focused. Refactors and behaviour changes go in separate PRs.

## Releasing

Maintainers only:

1. Bump `version` in `package.json`.
2. Commit, then tag: `git tag v0.x.y && git push origin v0.x.y`.
3. The `Release` workflow publishes to npm with provenance and opens the
   GitHub release.
