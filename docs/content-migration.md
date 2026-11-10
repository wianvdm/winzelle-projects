# Content migration backup

Read-only backup of the production Sanity dataset, exported at 2026-11-10T07:55:50Z during a maintainer-approved content freeze. Scope is W2 (#4) under parent #2. Raw content stays outside this repository; only sanitized evidence is recorded here. The W4 (#6) materialization of that backup into typed local content is recorded at the end of this document.

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
- Against the active UUID record it shares six identical fields, including the logo. `companyName` and `whatsappNumber` differ.
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

The backup is access-controlled and lives outside the repository. A durable non-temp copy is restricted to the current maintainer account; its ACL, file inventory, hashes, and NDJSON readability were verified. It holds two export files, an `assets/` directory, and four audit files: `manifest.json`, `asset-manifest.json`, `seed-reconciliation.json` and `verification.json`. The maintainer shares its location out of band. Do not copy raw exports or assets into the repository.

## Restore procedure

Not executed. Run it only when the maintainer approves a restore. Maintainer confirmation of backup readability and this procedure is pending review of this PR and must be recorded on W2 #4 before W4.

1. Verify the export against the recorded hash `9e1b5417292e67429f53816bedfc75623f17647cdfd271f4cc226e781e0492eb`, 27 lines and 14352 bytes.
2. Verify the asset against SHA-256 `24e5f6dfd6f61923b33f8b051d9ea2a22d5e7ec77540a8358a0787179be4d401` and 116977 bytes.
3. Import into a staging dataset first: `sanity dataset import <export-file> <staging-dataset>`. Import into `production` only after the staging pass, and export the current production state beforehand as the rollback point.
4. Confirm the five singleton queries above still resolve to the IDs listed, and that the frontend renders `bd1513ac-353a-48d9-994f-26fa271164a8` content.
5. Confirm the draft still exists and was not published by the import.

`sanity dataset import --replace` overwrites documents whose IDs already exist; without it the CLI skips them. Documents created after the export survive either way, so the production dataset needs a manual diff against the export after a restore.

## Boundaries

- W2 stops at this record. Migration, including the two differing draft fields, belongs to W4.
- Repository source edits: 0. CMS mutations: 0.

# W4 typed content materialization

Scope is W4 (#6) under parent #2. The canonical live content is now typed local data; Sanity runtime code, components, and the CMS dataset are untouched. Component cutover belongs to W5.

## What was materialized

| Path | Contents |
| --- | --- |
| `src/content/types.ts` | Local TypeScript types mirroring the Sanity schemas and component query needs |
| `src/content/site-settings.ts` | Canonical siteSettings `bd1513ac-353a-48d9-994f-26fa271164a8`, logo as `logoPath` |
| `src/content/hero.ts` | Canonical heroSection `b57833e6-745f-47c3-9f9f-b5c3212a8918` |
| `src/content/about.ts` | aboutSection |
| `src/content/services.ts` | All six services, displayOrder ascending |
| `src/content/projects.ts` | Empty collection, matching live |
| `src/content/contact.ts` | contactSection |
| `src/content/facebook-banner.ts` | facebookBanner |
| `src/content/index.ts` | Single export surface for W5 |
| `src/content/migration-manifest.json` | Source export hash, selected source IDs, counts, field coverage, draft decision |
| `public/content/images/winzelle-logo.jpg` | Verified logo asset, byte-identical to the backup copy |
| `public/content/media-manifest.json` | Asset source URL/ID, local path, bytes, SHA-1/SHA-256, approved omissions |
| `scripts/verify-content-migration.mjs` | Node built-in verifier, see below |

Raw exports, system documents, and seed-history records did not enter typed content. The `drafts.siteSettings` alternatives for `companyName` and `whatsappNumber` remain unselected; only the field names are recorded in the migration manifest, and only in the durable backup do the values survive.

## Verifier

```sh
node scripts/verify-content-migration.mjs
node scripts/verify-content-migration.mjs --source-export <path-to-export.ndjson>
```

Default mode validates the committed content, manifests, and asset with no inputs. `--source-export` also compares every typed value, count, canonical ID, field coverage, and asset record against a maintainer-supplied export identified by hash; the path is supplied at run time and never hardcoded. Requires Node >= 22.18 (or `--experimental-strip-types`) for TypeScript type stripping. No dependencies, no network access.

## Observed verification results (2026-11-10)

- Committed-content mode: 28/28 checks passed, exit 0.
- Source mode against export pass 1 (SHA-256 `9e1b5417292e67429f53816bedfc75623f17647cdfd271f4cc226e781e0492eb`, 27 lines, 14352 bytes): 137/137 checks passed, exit 0. Covered value equality for all mapped fields, service ordering, empty projects, asset URL/SHA-1/bytes/MIME, historical seed duplicates excluded, and no draft substitution.
- Negative control: injecting the draft `whatsappNumber` alternative into `src/content/site-settings.ts` failed both `siteSettings.whatsappNumber matches typed whatsappNumber` and `draft alternative for whatsappNumber not selected` (135/137, exit 1). Restoring the canonical value returned 137/137.
- Local logo asset: 116977 bytes, SHA-1 `f6cfd0b3999aa71621f351eb2452a3c12d449c30`, SHA-256 `24e5f6dfd6f61923b33f8b051d9ea2a22d5e7ec77540a8358a0787179be4d401`, matching the backup record and the media manifest.

## W4 boundaries

- No component, Sanity module, package file, workflow, or dataset change. Repository runtime rendering is unchanged.
- CMS mutations: 0. The draft remains untouched in the live dataset and in the backup.

# W5 component cutover and CMS removal

Scope is W5 (#7) under parent #2. The eight content components now read typed local content from `src/content/`; the entire CMS surface is deleted. Rendering values are unchanged: every component renders the canonical values the verifier compares against the export.

## What changed

- Components: `About`, `Footer`, `Hero`, `Navbar`, `Projects`, `QuoteForm`, `Services`, `WhatsAppButton` import from `src/content/` instead of fetching through `src/lib/sanity.client.ts`. Navbar, Hero, and Footer resolve the logo through `siteSettings.logoPath` (`/content/images/winzelle-logo.jpg`). The Projects Facebook card renders `facebookBanner.heading`/`subtitle` and `siteSettings.facebookUrl`.
- Removed per-component fallback content. Canonical typed values equal the previous fallback strings except where Sanity held the live value (contact details, WhatsApp number), which the live site already rendered from the CMS.
- Empty projects: the live `project` collection is empty, so `Projects` renders an empty grid with no demo or fallback cards. Gallery and lightbox behavior is preserved; cover images resolve through local `coverImagePath` instead of the Sanity image URL builder.
- QuoteForm submission is unchanged: Web3Forms POST with `VITE_WEB3FORMS_ACCESS_KEY`, for W7 to revisit.

## What was deleted

- `src/lib/sanity.client.ts`, `src/lib/sanity.queries.ts`
- `sanity/` (CLI config, project config, eight schemas)
- `studio/` (nested Studio app: configs, schemas, seed, lockfile)
- Dependencies: `sanity`, `@sanity/client`, `@sanity/image-url`, `@sanity/vision`
- `.env.example`: the `VITE_SANITY_PROJECT_ID`/`VITE_SANITY_DATASET` entries

The root `.gitignore` carried no CMS-specific rules, so it is unchanged. The raw export and asset backup stay outside the repository; this change removes no restore input.

## Observed verification results

- `node scripts/verify-content-migration.mjs`: 28/28 checks passed, exit 0.
- `node scripts/verify-content-migration.mjs --source-export <export-pass-1.ndjson>`: 137/137 checks passed, exit 0.
- `npm ci` from the regenerated lockfile: clean install succeeded.
- `npx tsc --noEmit`: passed with no errors and no suppressions.
- `npm run build`: Vite production build succeeded.
- `git diff --check`: clean.
- Lockfile regenerated by removing the four Sanity packages only; no other dependency version changed.
- Visual comparison at 1280x720 and 390x844 confirmed matching section order, typography, service cards, contact forms, and images. Intentional differences are the removal of three demo fallback project cards and replacement of generic placeholder social links with canonical values.

## W5 boundaries

- No CMS reads, writes, or mutations; the live dataset and its draft remain untouched in the backup only.
- Visual comparison artifacts are retained under `docs/visual-evidence/w5/`. No form submission or external action was performed.
- Dependency upgrades, Oxc, and the test toolchain belong to W6; form submission behavior belongs to W7.
