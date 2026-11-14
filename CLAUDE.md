# Agent policy (canonical)

Single source of truth for how agents and contributors work in this repository. `AGENTS.md` and `CONTRIBUTING.md` point here. If any file disagrees with this one, this one wins.

## Repository facts

- Public repository `wianvdm/winzelle-projects` since 2026-11-13, one maintainer: `@WianVDM`.
- npm is the package manager; `package-lock.json` is authoritative. Node 24.22.3 is pinned in `.nvmrc` and declared in `engines`. Install with `npm ci`; the verification gate is `npm run verify` (format:check, lint, typecheck, test, build).
- Production deploys to a Cloudflare Worker (`wrangler.toml`); content lives in typed modules under `src/content/`.
- GitHub enforces the `main` ruleset: changes require a pull request with 0 required approvals (a sole maintainer cannot approve their own PRs), squash merges only, linear history, resolved review conversations, no force pushes, no deletion, and no bypass actors. It also requires the `Verify` and `PR metadata` checks and up-to-date branches.
- Cloudflare credentials are deferred to W10 (#12). Do not request, create, or store them anywhere else.

## Issue-first workflow

- Every change starts with a GitHub issue created through an issue form. Blank issues are disabled.
- Branch names follow `issue/N-short-description`, where `N` is the child issue number. Example: `issue/5-repository-governance`.
- One issue per pull request. The PR body contains `Closes #N` for the child issue, never the parent.
- Security vulnerabilities never become public issues. Report privately per `SECURITY.md`.

## Labels

Use only labels that already exist. The maintainer creates labels; agents and contributors do not.

- Type (exactly one): `type:bug`, `type:feature`, `type:maintenance`, `type:docs`, `type:content`, `type:security`
- Shared areas: `area:ci`, `area:release`, `area:dependencies`, `area:repo`
- Winzelle areas: `area:frontend`, `area:forms`, `area:content`, `area:cloudflare`, `area:seo`
- Priority (maintainer-assigned): `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- Workflow state: `blocked`, `needs-info`
- Automation: `dependencies`, `automated`, `no-issue` (see exemptions below)

## Pull requests

- Focused: one issue, one outcome. Split unrelated work into separate PRs.
- Title: Conventional Commit, `<type>(<scope>): <short imperative summary>`. Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test. The scope is optional lowercase letters, digits and hyphens. A `!` after the type or scope marks a breaking change.
- Body: complete the PR template. Truthful verification only: mark a check executed solely when it ran and its result was observed; list everything relevant that did not run under Unexecuted Checks with the reason.
- UI changes include screenshots or a recording; otherwise state N/A.
- Screenshots, recordings and review evidence go in the PR description or comments and are never committed.
- The `PR metadata` check enforces the issue, label, title and exemption rules in this file.
- Every PR states Deployment & Privacy Impact and a Rollback Plan.

## Merge authority and agent prohibitions

The maintainer merges. An agent may squash-merge a pull request only when the maintainer approved agent merges earlier in the current session; approval ends with the session. Until W11 (#13) moves production to releases, a merge to `main` deploys production, and that approval covers the deploy. Agents never:

- merge without that approval, or push directly to `main`
- approve their own work or request their own review
- apply `no-issue` to themselves or otherwise exempt their own PR from the ticket requirement
- create tags, cut releases, or deploy
- administer secrets, branch rules, repository settings, or labels

## Ticket exemptions

Exactly three classes, each narrow:

1. `no-issue`: maintainer-only ticket exemption. Valid only when the maintainer applies the label to the PR, and the maintainer re-applies it after any new commit or force-push.
2. `dependencies`: dependency automation (Dependabot) from the approved bot identity.
3. `automated`: release automation (Release Please) from the approved bot identity.

Anything outside these three classes needs `Closes #N`. Bot exemptions bind to the exact bot author plus label; a human-applied `dependencies` or `automated` label is not an exemption.
