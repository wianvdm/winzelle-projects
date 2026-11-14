# Development

Setup and tooling reference. The contribution workflow lives in [CONTRIBUTING.md](../CONTRIBUTING.md); this document covers the scripts, environment and checks.

## Scripts

| Script                 | What it runs                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server on port 3000                                              |
| `npm run build`        | `node scripts/check-public-env.mjs && vite build` (env check, then build) |
| `npm run preview`      | Vite preview of the production build                                      |
| `npm run typecheck`    | `tsc --noEmit`                                                            |
| `npm run lint`         | oxlint                                                                    |
| `npm run format`       | oxfmt (write)                                                             |
| `npm run format:check` | oxfmt `--check`                                                           |
| `npm run test`         | vitest run                                                                |
| `npm run verify`       | format:check, lint, typecheck, test and build in sequence                 |

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

- `ci.yml` (`Verify`): installs with `npm ci` and runs `npm run verify` (format:check, lint, typecheck, test, build) on ubuntu-latest using the Node version from `.nvmrc`. It reads the public build variable from the `VITE_WEB3FORMS_ACCESS_KEY` repository variable, which the maintainer sets for CI builds; the build's env check fails in CI when the key is missing. Dependabot and fork PR runs may not receive repository variables, in which case Verify fails at the env check (to be confirmed on the first Dependabot PR).
- `pr-metadata.yml` (`PR metadata`): runs `scripts/pr-metadata.mjs` from the base commit, so a PR cannot change the rules it is checked against. It validates the PR title, labels, closing issue and ticket exemptions, and reports failures as annotations. A validator change applies to each open PR on its next event after the change merges.

Both checks become required in the `main` ruleset once they have green runs.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs for npm and GitHub Actions dependencies, limited to 5 open PRs each. Dependabot PRs carry the `dependencies`, `type:maintenance` and `area:dependencies` labels and `build(deps)` or `build(deps-dev)` title prefixes so they pass the `PR metadata` check under the bot exemption.

## Line endings on Windows

`.gitattributes` sets `* text=auto eol=lf`, so text files check out with LF on Windows and oxfmt's `endOfLine: "lf"` holds. The same file declares the binary media extensions under `public/`.
