# Production baseline

Observed read-only at 2026-11-09T13:31:09Z. Starting state for the production-readiness work under #2.

## GitHub

- Repository `wianvdm/winzelle-projects` is private on the GitHub Free plan, with one maintainer, `WianVDM`.
- HEAD at observation: `d986d35a35636dd39c49c9e99b603444d6f769a1`.
- One merged pull request, no open pull requests.
- Issues #3-#16 (W1-W14) and parent #2 exist on the Production readiness milestone.
- Branch protection and rulesets are unavailable. The API returns HTTP 403 with an upgrade requirement for a private Free repository. Merge commits, squash merges and rebase merges are enabled; `delete_branch_on_merge` is false.
- Zero workflows and zero check contexts.
- Vulnerability alerts and automated security fixes are disabled.

## Local toolchain

- Node 22.23.4, npm 10.9.9, git 2.55, gh 2.102.
- npm is the package manager; `package-lock.json` is authoritative.
- Wrangler is neither installed nor configured locally.

## DNS and HTTPS

- `winzelle.co.za` and `www.winzelle.co.za` both return Cloudflare HTTP 200.
- Cloudflare is the authoritative DNS provider and proxies the origin at the edge.

## Sanity public read path

- The production bundle reads Sanity project `bvpp9gzg`, dataset `production`, API version `2025-03-28`.
- Public queries against that dataset are reachable and return live content.

## Public service coordinates

| Service | Coordinate | Source |
| --- | --- | --- |
| Web host | `winzelle.co.za`, `www.winzelle.co.za` | Public DNS |
| Edge and DNS | Cloudflare | Public DNS and response headers |
| Worker | `winzelle-projects`, assets from `./dist`, SPA fallback | `wrangler.toml` |
| CMS | Sanity project `bvpp9gzg`, dataset `production`, API `2025-03-28` | Production bundle |

## Deferred decisions

| Decision | Owner | Ticket | Reason |
| --- | --- | --- | --- |
| GitHub Pro billing for branch protection and rulesets | Maintainer | W9 #11 | Remote enforcement needs a paid plan on a private repository |
| Cloudflare account, Worker and deployment inventory, API token scope | Maintainer | W10 #12 | Needs authenticated API access |
| Web3Forms recipient, allowed origins, spam and rate settings | Maintainer | Form and hosting work | Needs dashboard confirmation |
| Release Please identity | Maintainer | W10 | W10 prefers a repository-scoped GitHub App with contents and pull-requests write; a fine-grained PAT is the fallback |

## Unknown

- Cloudflare account ID, current Worker deployment ID, deployment history and token permissions.
- Web3Forms dashboard settings.
- Any GitHub setting gated behind a paid plan.

## Constraints

- Keep the repository private. Do not replace remote enforcement with local hooks.
- `VITE_WEB3FORMS_ACCESS_KEY` is a public build variable and needs origin restriction; never store it as a GitHub secret.
- Defer the Cloudflare token to W10 and scope it to the intended account and Worker for inventory and deployment.
- W2 can start with the public Sanity read path. If a complete export cannot be proven, the maintainer must provide a dataset export or read token.
