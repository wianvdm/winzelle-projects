# Architecture

Winzelle is a React 19 single-page application built with Vite 8 and TanStack Router, styled with Tailwind 4.

## Components

- `src/routes/`: file-based routes. The router plugin generates `src/routeTree.gen.ts` from them. Today there is a single route, `/`, defined in `src/routes/index.tsx` with the root layout in `src/routes/__root.tsx`.
- `src/content/`: typed content modules (hero, about, services, projects, contact, site settings) sharing the types in `src/content/types.ts`. Media sits in `public/content/`. It was migrated from Sanity; see [docs/content-migration.md](content-migration.md).
- `src/lib/public-env.ts`: reads the public Web3Forms key and exposes `getWeb3FormsAccessKey()`, which returns undefined when the key is missing or still the placeholder.
- `wrangler.toml`: a Cloudflare Worker serves `dist/` as static assets with `not_found_handling = "single-page-application"` for the SPA fallback. It also sets `workers_dev = false` and `preview_urls = false` (#58).
- `public/_headers`: response headers for the static assets (CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS, immutable `/assets/*`); see [docs/development.md](development.md) Security headers.

## Data flow

1. `npm run build` runs `scripts/check-public-env.mjs` first (see [docs/development.md](development.md)) and then emits the static bundle to `dist/`.
2. Cloudflare zone rules (Always Use HTTPS, the www to apex redirect) run at the edge before the Worker. The Worker serves `dist/`; client-side navigation stays in the browser via TanStack Router.
3. The quote form posts to Web3Forms directly from the browser using `VITE_WEB3FORMS_ACCESS_KEY`; there is no server endpoint for it in the Worker.
4. Publishing a release deploys production (W11, #13): the deploy workflow runs in the maintainer-approved `production` environment, builds the tag, deploys with `wrangler deploy`, smoke tests, and rolls back automatically on failure. A published release is the only production deploy. Merges to `main` only upload a Worker version through Workers Builds (`npx wrangler versions upload`, since 2026-11-14, #13) and move no traffic. `npm run rollback` wraps `wrangler rollback`; the manual rollback workflow and runbook live in [docs/rollback.md](rollback.md).
