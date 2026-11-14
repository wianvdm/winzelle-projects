# Winzelle Projects

Source for https://winzelle.co.za, the Winzelle Projects site: a React 19 SPA built with Vite 8 and TanStack Router, styled with Tailwind 4, served from a Cloudflare Worker.

## Quick start

Requires Node 24.22.3 (pinned in `.nvmrc`) and npm 11.

```bash
npm ci
cp .env.example .env
npm run dev       # Vite dev server on http://localhost:3000
npm run verify    # format:check, lint, typecheck, test, build
```

Copy `.env.example` to `.env` and set `VITE_WEB3FORMS_ACCESS_KEY` before building. `VITE_` values are public and baked into the bundle, so never put secrets in them.

## Where content lives

Site content lives in typed modules under `src/content/`; media lives in `public/content/`. To change content, edit those modules and open a PR per [CONTRIBUTING.md](CONTRIBUTING.md); a merge to `main` reaches production with the next published release. The content was migrated from Sanity; see [docs/content-migration.md](docs/content-migration.md).

## Deployment

A Cloudflare Worker serves `dist/` as static assets with an SPA fallback, configured in `wrangler.toml`. Publishing a GitHub release is the only production deploy path (W11, #13): the deploy workflow builds the tag, deploys it in the maintainer-approved `production` environment, smoke tests the result, and rolls back to the previous version automatically on failure. A known-good version is restorable in one maintainer action through the rollback workflow; see [docs/rollback.md](docs/rollback.md).

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): issue, branch and PR workflow, plus local development.
- [SECURITY.md](SECURITY.md): how to report security vulnerabilities.
- [docs/development.md](docs/development.md): scripts, environment variables, tests, lint and format.
- [docs/architecture.md](docs/architecture.md): components and data flow.
- [docs/content-migration.md](docs/content-migration.md): record of the Sanity content migration.
- [docs/production-baseline.md](docs/production-baseline.md): the dated W1 production baseline.

## Licence

The MIT licence covers the source code, see [LICENSE](LICENSE). Winzelle brand assets and site content are all rights reserved, see [NOTICE](NOTICE).
