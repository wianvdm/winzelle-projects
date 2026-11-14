# Development

Setup and tooling reference. The contribution workflow lives in [CONTRIBUTING.md](../CONTRIBUTING.md); this document covers the scripts, environment and checks.

## Scripts

| Script                  | What it runs                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server on port 3000                                              |
| `npm run build`         | `node scripts/check-public-env.mjs && vite build` (env check, then build) |
| `npm run preview`       | Vite preview of the production build                                      |
| `npm run typecheck`     | `tsc --noEmit`                                                            |
| `npm run lint`          | oxlint                                                                    |
| `npm run format`        | oxfmt (write)                                                             |
| `npm run format:check`  | oxfmt `--check`                                                           |
| `npm run test`          | vitest run                                                                |
| `npm run smoke`         | `node scripts/smoke.mjs` (read-only production smoke test)                |
| `npm run verify`        | format:check, lint, typecheck, test and build in sequence                 |
| `npm run deploy`        | `wrangler deploy` (manual; not the production deploy path)                |
| `npm run versions:list` | `wrangler versions list`                                                  |
| `npm run rollback`      | `wrangler rollback`                                                       |

## Environment variables

The site has one public build-time variable:

- `VITE_WEB3FORMS_ACCESS_KEY`: access key for the Web3Forms quote form. It is invalid when missing, empty or whitespace-only, or equal to the `.env.example` placeholder `your-web3forms-access-key`.

`scripts/check-public-env.mjs` runs first in `npm run build`. It loads env the way Vite does (Vite `loadEnv` for mode `production`, prefix `VITE_`), so `process.env` values override `.env` files. When the key is invalid, it exits 1 with a clear message if `CI` or `WORKERS_CI` is set, and otherwise prints a warning and exits 0. Local builds warn and continue; CI builds fail. Cloudflare Workers Builds sets `CI=true` and `WORKERS_CI=1` by default: <https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>.

`src/lib/public-env.ts` exports `getWeb3FormsAccessKey(): string | undefined` (undefined when the key is invalid) and `PLACEHOLDER_WEB3FORMS_ACCESS_KEY`. Cloudflare Workers Builds sets the real key; the live bundle carries one.

## Tests

Vitest 5.1.0 with the default environment `node` and globals off. Files that need a DOM opt in per file with a `// @vitest-environment jsdom` docblock comment and use jsdom with `@testing-library/react` and `@testing-library/dom`. There is no `@testing-library/jest-dom`. Tests never submit the quote form and never make network calls to Web3Forms.

## Lint and format

- `.oxlintrc.json`: oxlint with the react and typescript plugins; correctness rules are errors.
- `.oxfmtrc.json`: oxfmt with print width 80, two-space indentation, no semicolons, single quotes, LF line endings.

Both configs ignore `src/routeTree.gen.ts` and `dist`; the oxfmt config also ignores `package-lock.json`.

## Continuous integration

Two workflows run on every pull request to `main`, and CI also runs on pushes to `main`. Both live under `.github/workflows/` and pin their actions by full commit SHA.

- `ci.yml` (`Verify`): installs with `npm ci` and runs `npm run verify` (format:check, lint, typecheck, test, build) on ubuntu-latest using the Node version from `.nvmrc`. It reads the public build variable from the `VITE_WEB3FORMS_ACCESS_KEY` repository variable, which the maintainer sets for CI builds; the build's env check fails in CI when the key is missing. Dependabot runs receive the repository variable (observed on #30 to #34); fork PR runs are unverified and may not, in which case Verify fails at the env check.
- `pr-metadata.yml` (`PR metadata`): runs `scripts/pr-metadata.mjs` from the base commit, so a PR cannot change the rules it is checked against. It validates the PR title, labels, closing issue and ticket exemptions, and reports failures as annotations. A validator change applies to each open PR on its next event after the change merges.

The `main` ruleset requires both checks and up-to-date branches.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs for npm and GitHub Actions dependencies, limited to 5 open PRs each. Dependabot PRs carry the `dependencies`, `type:maintenance` and `area:dependencies` labels and `build(deps)` or `build(deps-dev)` title prefixes so they pass the `PR metadata` check under the bot exemption.

## Releases

Release Please (`.github/workflows/release-please.yml`) runs on every push to `main`. It mints a token for the `winzelle-release` GitHub App (repository variable `RELEASE_APP_ID`, repository secret `RELEASE_APP_PRIVATE_KEY`) and runs `googleapis/release-please-action` against `release-please-config.json` and `.release-please-manifest.json`. The App token does the writing; the workflow's own `GITHUB_TOKEN` stays read-only.

- Release PRs come from `winzelle-release[bot]` and carry the labels `autorelease: pending`, `automated`, `type:maintenance` and `area:release`, so they pass the `PR metadata` check under the `automated` ticket exemption. Merging a release PR tags `v<version>` and relabels the PR `autorelease: tagged`. The tag ruleset allows only the App to create `v*` tags, and nobody to update or delete them. The labels must not be edited by hand: Release Please finds its PR by all four labels, and changing them would make it open a duplicate.
- Versioning is pre-1.0: `bump-minor-pre-major` turns breaking changes into a minor bump. The manifest starts at `0.0.0` and `initial-version: "0.1.0"` in the config makes the first release PR propose exactly 0.1.0; the option is inert once a release exists, so nothing is pinned for later releases.
- The first `PR metadata` run on a release PR can fail or be cancelled before the labels land; the `labeled` re-run settles it.
- Publishing a release is the only production deploy path (W11, #13). `.github/workflows/deploy-production.yml` triggers on release publication, runs in the `production` environment (maintainer approval), builds the tag, deploys with `wrangler deploy`, and smoke tests the result. On smoke failure it rolls back to the previously live version and smoke tests the rollback; the run stays failed either way. The job summary and the release notes record tag, commit, Worker version IDs, actor and timestamp. Re-running the workflow for the same release redeploys that tag; tags are never moved or reused. Merging a release PR publishes a release, so only the maintainer merges release PRs.
- Merges to `main` no longer deploy production: right after this change merges, the maintainer switches the Cloudflare Workers Builds production deploy command from `npx wrangler deploy` to `npx wrangler versions upload` in the dashboard, so merges only upload a Worker version without moving traffic. Branch preview builds are unchanged and use Cloudflare's own build token, never GitHub secrets.
- `.github/workflows/rollback.yml` (Actions → Rollback production) restores a named or the previous Worker version in the `production` environment and smoke tests the result. The runbook is [docs/rollback.md](rollback.md).
- The `production` GitHub environment requires review by `@WianVDM` and limits deployments to `v*` tags and `main`. It holds the environment secret `CLOUDFLARE_API_TOKEN` (account-scoped, Workers Scripts write only) and the environment variable `CLOUDFLARE_ACCOUNT_ID`. Names only; values never enter the repository.
- `.github/workflows/cloudflare-check.yml` runs on `workflow_dispatch` only, inside the `production` environment, and is read-only. It first fails fast if the token is missing, then calls the token verify API and fails unless the token is active, then lists deployments as JSON and prints only each deployment's ID, created-on time, source and version IDs. It prints no emails and no account names, because the repo is public. It collects W10 evidence; `deploy-production.yml` and `rollback.yml` reuse its environment wiring.

### Hosting records (2026-11-14)

Cloudflare Workers Builds: repository `WianVDM/winzelle-projects`, production branch `main`, non-production branch builds on, build command `npm run build`, deploy command `npx wrangler deploy`, non-production version command `npx wrangler versions upload`, root directory `/`, watch paths `*`, build token (Cloudflare-managed; the display name is not recorded here). Branch preview URLs are enabled. `winzelle.co.za`, `www.winzelle.co.za` and the account's `workers.dev` URL all serve the Worker with HTTP 200; the www redirect is tracked in #43.

Web3Forms (free plan): captcha None, Spam Protection Level Basic, Advanced Spam Filter off (left off on purpose: server-side drops would be invisible), Restrict to Domains unsupported (Pro-only, excluded by the zero-paid rule). The recipient is the maintainer's test inbox and must switch to the business inbox before W14 (#16). The form code has no captcha; a missing public key fails the build via `scripts/check-public-env.mjs` (W7).

## Line endings on Windows

`.gitattributes` sets `* text=auto eol=lf`, so text files check out with LF on Windows and oxfmt's `endOfLine: "lf"` holds. The same file declares the binary media extensions under `public/`.
