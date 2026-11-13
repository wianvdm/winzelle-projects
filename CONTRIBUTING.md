# Contributing

Winzelle is a public repository with one maintainer, `@WianVDM`. The canonical policy for humans and agents is [`CLAUDE.md`](CLAUDE.md); this guide is the human walkthrough of the same rules.

## Filing issues

- Use an issue form: Bug, Feature or task, Investigation, Maintenance, Release, or Content. Blank issues are disabled.
- Every form requires an outcome and acceptance criteria. Risk, test, and rollback fields scale with the change; fill them in for medium and high risk.
- Forms apply only canonical labels (one type, plus area for releases). Priority and further area labels are maintainer-assigned during triage. Do not invent labels.
- Security vulnerabilities are never public issues. Follow [`SECURITY.md`](SECURITY.md).

## Branches and pull requests

1. Start from an issue. Branch name: `issue/N-short-description`, where `N` is the issue number. Example: `issue/5-repository-governance`.
2. Keep the PR focused: one issue, one outcome.
3. Title it as a Conventional Commit: `<type>(<scope>): <short imperative summary>`.
4. Fill in the PR template completely, including `Closes #N` for the child issue (never the parent).

## Verification

- Mark a check executed only when you ran it and observed the result. Everything relevant that did not run goes under Unexecuted Checks with the reason.
- UI changes need screenshots or a recording, posted as PR comments and never committed; otherwise write N/A.
- State Deployment & Privacy Impact and a Rollback Plan on every PR.

## Review and merge

- CODEOWNERS routes review for governance, CI, release, package, deployment, and public environment files to the maintainer.
- Humans alone merge. Agents never merge, self-approve, self-exempt, tag, deploy, or administer secrets and repository rules.
- The `main` ruleset enforces pull requests on GitHub: squash merges only, linear history, resolved conversations, no force pushes and no deletion. Required approvals stay at 0 because a sole maintainer cannot approve their own PRs. Required status checks arrive with W8 (#10).

## Ticket exemptions

A PR without `Closes #N` is valid in exactly three cases, detailed in `CLAUDE.md`: the maintainer applies `no-issue`, or the PR comes from the approved Dependabot (`dependencies`) or Release Please (`automated`) bot identity. Self-exemption is never valid.

## Local development

Use Node 24.22.3, pinned in `.nvmrc`.

```bash
npm ci          # install from package-lock.json
npm run dev     # Vite dev server on port 3000
npm run verify  # format:check, lint, typecheck, test, build
```

Copy `.env.example` to `.env` for local variables. `VITE_` prefixed variables are public at build time: never put credentials in them.
