# Content migration backup

Read-only backup of the production Sanity dataset, exported at 2026-11-10T07:55:50Z during a maintainer-approved content freeze. Scope is W2 (#4) under parent #2. Raw content stays outside this repository; only sanitized evidence is recorded here.

## Approval and status

- The maintainer froze writes for the export window and confirmed the freeze.
- Dataset: Sanity project `bvpp9gzg`, dataset `production`, API `2025-03-28`.
- Amended acceptance item: "zero drafts" became "every draft enumerated and preserved". Raw-perspective reads show one draft that published-perspective queries hide.
- No restore, import or other CMS mutation has been executed. This runbook records verified backup inputs only.

## Exports

Two authenticated exports of the full dataset, byte-identical:

| Pass | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- |
| 1 | 27 | 14352 | `9e1b5417292e67429f53816bedfc75623f17647cdfd271f4cc226e781e0492eb` |
| 2 | 27 | 14352 | `9e1b5417292e67429f53816bedfc75623f17647cdfd271f4cc226e781e0492eb` |

Either pass is a restore input. Cite the selected file by that hash.

## Classification

27 documents in total.

| Class | Count | Contents |
| --- | --- | --- |
| Published application | 14 | `siteSettings` 2, `heroSection` 2, `service` 6, `aboutSection` 1, `contactSection` 1, `facebookBanner` 1, `sanity.imageAsset` 1 |
| Preserved draft | 1 | `drafts.siteSettings` |
| System | 12 | `system.group` 11, `system.retention` 1 |

## Draft decision

- `drafts.siteSettings` is the working copy of seed-ID `siteSettings` and adds only the logo to it.
- Against the active UUID record it shares the logo asset and six other fields. `companyName` and `whatsappNumber` differ.
- Publishing it would update only seed-ID `siteSettings`, which the frontend does not resolve. Discarding it would drop the only copy of the two differing values.
- Accepted rule: leave the draft untouched and preserve it in the backup. W4 carries both values into the migration and decides them there.

`verification.json` reports overall status `FAILED_INVARIANT` on `zero_drafts` alone; every other invariant passed. The amended acceptance item replaces that check.

## Assets

One referenced asset, downloaded and checksum-verified.

| Asset | MIME | Bytes | SHA-1 | SHA-256 |
| --- | --- | --- | --- | --- |
| `image-f6cfd0b3999aa71621f351eb2452a3c12d449c30-1024x1024-jpg` | `image/jpeg` | 116977 | `f6cfd0b3999aa71621f351eb2452a3c12d449c30` | `24e5f6dfd6f61923b33f8b051d9ea2a22d5e7ec77540a8358a0787179be4d401` |

The SHA-1 matches the asset hash in the document ID. Referenced by `drafts.siteSettings` and `bd1513ac-353a-48d9-994f-26fa271164a8`.

## Seed reconciliation

- 11 of 11 seed records from `studio/seed.ndjson` exist in the live dataset with matching types.
- Two UUID records of the same type win the frontend `[0]` query ahead of their seed singletons. Both are in the export, so a restore keeps current rendering.

Active singleton resolution:

| Query | Resolved ID |
| --- | --- |
| `*[_type == "siteSettings"][0]` | `bd1513ac-353a-48d9-994f-26fa271164a8` |
| `*[_type == "heroSection"][0]` | `b57833e6-745f-47c3-9f9f-b5c3212a8918` |
| `*[_type == "aboutSection"][0]` | `aboutSection` |
| `*[_type == "contactSection"][0]` | `contactSection` |
| `*[_type == "facebookBanner"][0]` | `facebookBanner` |

`bd1513ac-353a-48d9-994f-26fa271164a8` is W4 canonical content. The seed-ID `siteSettings` record is historical and stays for the draft.

## Restore inputs

- Restore-input validation passed with zero errors: every exported line is valid NDJSON with a valid `_id` and `_type`.
- Restore is unverified end to end. The import has never run against any dataset.

## Locating the backup

The backup is access-controlled and lives outside the repository. It holds two export files, an `assets/` directory, and four audit files: `manifest.json`, `asset-manifest.json`, `seed-reconciliation.json` and `verification.json`. The maintainer shares its location out of band. Do not copy raw exports or assets into the repository.

## Restore procedure

Not executed. Run it only when the maintainer approves a restore.

1. Verify the export against the recorded hash `9e1b5417292e67429f53816bedfc75623f17647cdfd271f4cc226e781e0492eb`, 27 lines and 14352 bytes.
2. Verify the asset against SHA-256 `24e5f6dfd6f61923b33f8b051d9ea2a22d5e7ec77540a8358a0787179be4d401` and 116977 bytes.
3. Import into a staging dataset first: `sanity dataset import <export-file> <staging-dataset>`. Import into `production` only after the staging pass, and export the current production state beforehand as the rollback point.
4. Confirm the five singleton queries above still resolve to the IDs listed, and that the frontend renders `bd1513ac-353a-48d9-994f-26fa271164a8` content.
5. Confirm the draft still exists and was not published by the import.

`sanity dataset import --replace` overwrites documents whose IDs already exist; without it the CLI skips them. Documents created after the export survive either way, so the production dataset needs a manual diff against the export after a restore.

## Boundaries

- W2 stops at this record. Migration, including the two differing draft fields, belongs to W4.
- Repository source edits: 0. CMS mutations: 0.
