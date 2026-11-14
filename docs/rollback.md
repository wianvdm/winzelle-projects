# Rollback runbook

How to restore a previous production version. Rollback moves traffic back to a
Worker version Cloudflare still holds; it never rebuilds code and never moves
tags.

## When to roll back

- The release deploy workflow (`.github/workflows/deploy-production.yml`)
  smoke test fails and the automatic rollback did not run or did not hold.
- The site misbehaves after a deploy that passed smoke.

Rollback restores the last known-good version within minutes. It does not fix
the code: code recovery is a revert on `main` plus a new patch release. Tags
are never moved or reused, so the fix ships as a new `v<version>`.

## What the automatic rollback does

When the deploy workflow's smoke test fails, it rolls back to the version that
was live before the deploy (recorded before `wrangler deploy` ran), smoke
tests that rollback, and leaves the run failed either way. A failed deploy run
with a green post-rollback smoke means production is on the previous version
and only the release needs attention. No previous version exists only when the
Worker has never been deployed; in that case the run fails without a rollback.

## Running a manual rollback

1. Open Actions → Rollback production → Run workflow (on `main`).
2. Fill in the inputs:
   - `version_id`: the Worker version to restore. Leave empty to restore the
     most recent deployment whose version differs from the live one and that
     no rollback rolled back from (so the default never lands on the
     known-bad release after an automatic rollback). Must be a UUID when
     given.
   - `reason`: why you are rolling back. Required; a single line without `|`
     characters, recorded in the deployment message and the run summary.
3. Run the workflow, then approve the `production` deployment when prompted.
4. The job rolls back, re-reads the live version, and smoke tests
   `https://winzelle.co.za`. The run fails when the smoke test fails; check
   the job summary for the before and after version IDs.

The deploy and rollback workflows share the `production` concurrency group.
A deploy waiting for approval holds the group, so a rollback queues behind
it: approve or reject the waiting deploy first. GitHub keeps only one
pending run per group, so a newer pending run (for example a new release
deploy) cancels a queued rollback; after starting a rollback, check in the
Actions list that it actually ran.

## Finding version IDs

- The deploy job summary and the release notes list the new and previous
  Worker version IDs for every release deploy.
- `.github/workflows/cloudflare-check.yml` (Actions → Cloudflare check → Run
  workflow) lists current deployment and version IDs.
- Locally with credentials: `npx wrangler deployments list`.

## After a rollback

The smoke test after a rollback proves the site is healthy, not that the
target version's bundle is live; the job summary's "Live version after" is
the authoritative version ID.

Open a revert PR for the broken change, then let Release Please cut a patch
release. Publishing that release deploys the fix through the normal path.

## Caveats

- Re-running an older release's deploy workflow redeploys that older tag
  over whatever is live, including a newer release.
- The Worker must already exist: the first-ever deploy path is not
  supported, because `wrangler deployments list` errors for a missing
  Worker. Create the Worker with a manual `wrangler deploy` first.
