# Contributing

Thanks for looking. This project is small on purpose: a zero-dependency
TypeScript library that rebuilds a page with a swarm of cursors.

## Setup

```bash
npm install          # installs deps and the git hooks
npm run build
npm run demo         # serves the demo pages on a Vite server
```

Node 26. That is the version CI runs.

## Scripts

| Command                    | What it does                                   |
| -------------------------- | ---------------------------------------------- |
| `npm run typecheck`        | `tsc --noEmit`                                 |
| `npm run build`            | bundle with tsup, emit types                   |
| `npm run api-report`       | regenerate `api-report.md` from the public API |
| `npm run api-report:check` | fail if `api-report.md` is stale               |
| `npm run test:e2e`         | Playwright suite (Chromium)                    |
| `npm run format`           | Prettier on `src`                              |
| `npm run pack:check`       | check the npm tarball before publishing        |

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

Maintainers only. Versions are automated with
[release-please](https://github.com/googleapis/release-please): there is no
manual `npm version` and no hand-pushed tag.

1. Merge your work to `main` with a Conventional Commit message.
2. Merge the release PR (`chore(main): release x.y.z`) that release-please
   keeps up to date. It bumps `package.json`, writes `CHANGELOG.md`, tags
   `vX.Y.Z` and opens the GitHub release.
3. The tag triggers `release.yml`: it builds, runs the e2e suite against the
   packed tarball, then publishes it to npm with provenance through trusted
   publishing (OIDC, no token). It refuses to publish unless the tag is an
   ancestor of `main` and matches `package.json`.

The workflow needs no secret: `release-please` runs on the default
`GITHUB_TOKEN`. See the README for the full setup.
