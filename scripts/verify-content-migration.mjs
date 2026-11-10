#!/usr/bin/env node
// Verifies the W4 typed content migration.
//
// Usage:
//   node scripts/verify-content-migration.mjs
//       Validate committed typed content, manifests, and local assets.
//   node scripts/verify-content-migration.mjs --source-export <file.ndjson>
//       Also compare typed content against a maintainer-supplied
//       Sanity export (NDJSON). The export never enters the repository.
//
// Requires Node >= 22.18 (type stripping) or the --experimental-strip-types
// flag. Uses only Node built-ins; no dependencies, no network access.

import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const status = ok ? 'PASS' : 'FAIL'
  console.log(`${status}  ${name}${detail ? `: ${detail}` : ''}`)
}

function repoPath(...segments) {
  return path.join(repoRoot, ...segments)
}

function loadJson(...segments) {
  return JSON.parse(readFileSync(repoPath(...segments), 'utf8'))
}

function fileDigests(filePath) {
  const bytes = readFileSync(filePath)
  return {
    bytes: bytes.length,
    sha1: createHash('sha1').update(bytes).digest('hex'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

function deepEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]))
  }
  return false
}

function isSystemKey(key) {
  return key.startsWith('_')
}

// Mirrors the classification recorded in the migration manifest.
function classifyDocument(doc) {
  if (doc._id.startsWith('_.') || doc._type.startsWith('system.')) return 'system'
  if (doc._id.startsWith('drafts.')) return 'draft'
  return 'published'
}

function parseSourceFlag(argv) {
  if (argv.length === 0) return null
  if (argv.length !== 2 || argv[0] !== '--source-export' || !argv[1] || argv[1].startsWith('--')) {
    console.error('FAIL  usage: verify-content-migration.mjs [--source-export <file.ndjson>]')
    process.exit(1)
  }
  return path.resolve(argv[1])
}

function loadSourceExport(exportPath) {
  const bytes = readFileSync(exportPath)
  const text = bytes.toString('utf8')
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  const docs = lines.map((line) => JSON.parse(line))
  return {
    byteCount: bytes.length,
    lineCount: lines.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    docs,
    byId: new Map(docs.map((doc) => [doc._id, doc])),
  }
}

const SINGLETON_TYPES = [
  'siteSettings',
  'heroSection',
  'aboutSection',
  'contactSection',
  'facebookBanner',
]

function loadTypedContent() {
  const entry = pathToFileURL(repoPath('src', 'content', 'index.ts')).href
  return import(entry)
}

function verifyMediaAssets(mediaManifest) {
  for (const asset of mediaManifest.assets) {
    const assetPath = repoPath('public', 'content', asset.localPath)
    let stats
    try {
      stats = statSync(assetPath)
    } catch {
      check(`asset exists (${asset.localPath})`, false, 'file not found')
      continue
    }
    const digests = fileDigests(assetPath)
    check(`asset bytes (${asset.localPath})`, stats.size === asset.bytes,
      `${digests.bytes} on disk, ${asset.bytes} in manifest`)
    check(`asset sha1 (${asset.localPath})`, digests.sha1 === asset.sha1)
    check(`asset sha256 (${asset.localPath})`, digests.sha256 === asset.sha256)
  }
}

function verifyLogoWiring(content, mediaManifest) {
  const asset = mediaManifest.assets.find((a) =>
    a.referencedBy.some((ref) => ref.field === 'logoPath'))
  check('logo asset declared in media manifest', Boolean(asset))
  if (!asset) return
  check('siteSettings.logoPath matches media manifest',
    content.siteSettings.logoPath === asset.publicUrlPath,
    `${content.siteSettings.logoPath} vs ${asset.publicUrlPath}`)
  const filePath = repoPath('public', asset.publicUrlPath.replace(/^\//, ''))
  let exists = true
  try {
    statSync(filePath)
  } catch {
    exists = false
  }
  check('logo file exists under public/', exists, asset.publicUrlPath)
}

function verifyServices(content, migration) {
  const { services } = content
  check('services count matches manifest',
    services.length === migration.counts.services,
    `${services.length} typed, ${migration.counts.services} in manifest`)
  const typedIds = services.map((service) => service.id)
  check('service ids match selected source ids',
    deepEqual(typedIds, migration.selectedSourceIds.services))
  const orders = services.map((service) => service.displayOrder)
  const ascending = orders.every((order, i) => i === 0 || orders[i - 1] < order)
  check('service displayOrder strictly ascending', ascending, orders.join(', '))
}

function verifyCounts(content, migration) {
  check('projects empty', content.projects.length === migration.counts.projects,
    `${content.projects.length} typed, ${migration.counts.projects} in manifest`)
  for (const type of SINGLETON_TYPES) {
    check(`${type} count is 1`, migration.counts[type] === 1)
  }
}

function verifyFieldCoverageShape(content, migration) {
  const typedByType = {
    siteSettings: content.siteSettings,
    heroSection: content.heroSection,
    aboutSection: content.aboutSection,
    contactSection: content.contactSection,
    facebookBanner: content.facebookBanner,
  }
  for (const [type, doc] of Object.entries(typedByType)) {
    const mapped = migration.fieldCoverage[type].mapped
    const localKeys = Object.values(mapped)
    const missing = localKeys.filter((key) => !(key in doc))
    check(`${type}: all mapped fields present in typed module`, missing.length === 0,
      missing.join(', '))
    const extra = Object.keys(doc).filter((key) => !localKeys.includes(key))
    check(`${type}: no typed fields outside manifest coverage`, extra.length === 0,
      extra.join(', '))
  }
  const serviceKeys = new Set()
  for (const service of content.services) {
    for (const key of Object.keys(service)) serviceKeys.add(key)
  }
  const mappedServiceKeys = Object.values(migration.fieldCoverage.service.mapped)
  const serviceDiff = [...serviceKeys].filter((k) => !mappedServiceKeys.includes(k))
    .concat(mappedServiceKeys.filter((k) => !serviceKeys.has(k)))
  check('service: typed keys match manifest coverage', serviceDiff.length === 0,
    serviceDiff.join(', '))
}

function verifyDraftRecord(migration) {
  const draftEntries = Object.entries(migration.drafts)
  check('draft record present', draftEntries.length === 1)
  for (const [draftId, record] of draftEntries) {
    const names = record.unselectedFieldNames
    check(`draft ${draftId}: unselected field names recorded`,
      Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === 'string'),
      names.join(', '))
  }
}

function verifyExportFile(exportData, migration) {
  const expected = migration.source.export
  check('export sha256 matches manifest', exportData.sha256 === expected.sha256)
  check('export line count matches manifest',
    exportData.lineCount === expected.lines,
    `${exportData.lineCount} vs ${expected.lines}`)
  check('export byte count matches manifest',
    exportData.byteCount === expected.bytes,
    `${exportData.byteCount} vs ${expected.bytes}`)
}

function verifyComposition(exportData, migration) {
  const classes = { system: 0, draft: 0, published: 0 }
  for (const doc of exportData.docs) classes[classifyDocument(doc)] += 1
  const expected = migration.source.composition
  check('composition: total documents',
    exportData.docs.length === expected.totalDocuments)
  check('composition: system documents',
    classes.system === expected.systemDocuments)
  check('composition: preserved drafts',
    classes.draft === expected.preservedDraftDocuments)
  check('composition: published application documents',
    classes.published === expected.publishedApplicationDocuments)
}

function verifySelectedDocuments(exportData, migration, content) {
  const selected = migration.selectedSourceIds
  const typedByType = {
    siteSettings: content.siteSettings,
    heroSection: content.heroSection,
    aboutSection: content.aboutSection,
    contactSection: content.contactSection,
    facebookBanner: content.facebookBanner,
  }
  for (const type of SINGLETON_TYPES) {
    const id = selected[type]
    const doc = exportData.byId.get(id)
    check(`${type}: selected document ${id} present`, Boolean(doc))
    if (!doc) continue
    check(`${type}: selected document is published`, classifyDocument(doc) === 'published')
    check(`${type}: document type matches`, doc._type === type)
    verifyMappedFields({ type, doc, typed: typedByType[type], coverage: migration.fieldCoverage[type] })
  }
  verifyServiceDocuments(exportData, migration, content)
}

function verifyMappedFields({ type, doc, typed, coverage }) {
  const mapped = coverage.mapped
  const omissions = coverage.approvedOmissions.map((entry) => entry.field)
  for (const [sourceField, localKey] of Object.entries(mapped)) {
    if (sourceField === '_id') continue
    if (type === 'siteSettings' && sourceField === 'logo') continue
    check(`${type}.${sourceField} matches typed ${localKey}`,
      deepEqual(doc[sourceField], typed[localKey]))
  }
  const sourceFields = Object.keys(doc).filter((key) => !isSystemKey(key))
  const unmapped = sourceFields.filter(
    (field) => !(field in mapped) && !omissions.includes(field))
  check(`${type}: every source field mapped or approved omission`,
    unmapped.length === 0, unmapped.join(', '))
}

function verifyServiceDocuments(exportData, migration, content) {
  const selected = migration.selectedSourceIds.services
  const publishedServices = exportData.docs.filter(
    (doc) => doc._type === 'service' && classifyDocument(doc) === 'published')
  const exportedIds = publishedServices.map((doc) => doc._id).sort()
  check('export service ids match selected ids',
    deepEqual(exportedIds, [...selected].sort()))
  for (const service of content.services) {
    const doc = exportData.byId.get(service.id)
    check(`service ${service.id}: present and published`,
      Boolean(doc) && classifyDocument(doc) === 'published')
    if (!doc) continue
    verifyMappedFields({ type: 'service', doc, typed: service, coverage: migration.fieldCoverage.service })
  }
}

function verifyLogoSource(exportData, migration, mediaManifest) {
  const doc = exportData.byId.get(migration.selectedSourceIds.siteSettings)
  const asset = mediaManifest.assets.find((a) =>
    a.referencedBy.some((ref) => ref.field === 'logoPath'))
  if (!doc || !asset) return
  check('canonical logo asset ref matches media manifest source id',
    doc.logo?.asset?._ref === asset.sourceId)
  const assetDoc = exportData.byId.get(asset.sourceId)
  check('image asset document present in export', Boolean(assetDoc))
  if (!assetDoc) return
  check('asset source url matches export', assetDoc.url === asset.sourceUrl)
  check('asset sha1 matches export sha1hash', assetDoc.sha1hash === asset.sha1)
  check('asset bytes match export size', assetDoc.size === asset.bytes)
  check('asset mime type matches export', assetDoc.mimeType === asset.mimeType)
}

function verifyNoDraftSubstitution(exportData, migration, content) {
  for (const [draftId, record] of Object.entries(migration.drafts)) {
    const draft = exportData.byId.get(draftId)
    check(`draft ${draftId} present in export`, Boolean(draft))
    if (!draft) continue
    for (const field of record.unselectedFieldNames) {
      const differs = !deepEqual(draft[field], content.siteSettings[field])
      check(`draft alternative for ${field} not selected`, differs)
    }
  }
}

function verifyExcludedDocuments(exportData, migration) {
  const selectedIds = new Set([
    ...Object.values(migration.selectedSourceIds).flatMap((v) =>
      Array.isArray(v) ? v : [v]),
  ])
  for (const id of migration.excluded.historicalSeedDuplicates) {
    const doc = exportData.byId.get(id)
    check(`historical duplicate ${id} present in export`, Boolean(doc))
    if (!doc) continue
    check(`historical duplicate ${id} not selected`, !selectedIds.has(id))
    check(`historical duplicate ${id} shares type with canonical`,
      doc._type in migration.selectedSourceIds &&
      migration.selectedSourceIds[doc._type] !== id)
  }
  const projectDocs = exportData.docs.filter(
    (doc) => doc._type === 'project' && classifyDocument(doc) === 'published')
  check('no published project documents in export', projectDocs.length === 0)
}

function verifyAgainstSource({ exportPath, migration, mediaManifest, content }) {
  const exportData = loadSourceExport(exportPath)
  verifyExportFile(exportData, migration)
  verifyComposition(exportData, migration)
  verifySelectedDocuments(exportData, migration, content)
  verifyLogoSource(exportData, migration, mediaManifest)
  verifyNoDraftSubstitution(exportData, migration, content)
  verifyExcludedDocuments(exportData, migration)
}

async function main() {
  const exportPath = parseSourceFlag(process.argv.slice(2))
  const migration = loadJson('src', 'content', 'migration-manifest.json')
  const mediaManifest = loadJson('public', 'content', 'media-manifest.json')
  const content = await loadTypedContent()

  verifyMediaAssets(mediaManifest)
  verifyLogoWiring(content, mediaManifest)
  verifyServices(content, migration)
  verifyCounts(content, migration)
  verifyFieldCoverageShape(content, migration)
  verifyDraftRecord(migration)

  if (exportPath) {
    console.log(`\nComparing against source export: ${exportPath}\n`)
    verifyAgainstSource({ exportPath, migration, mediaManifest, content })
  } else {
    console.log('\nCommitted-content mode. Pass --source-export <file.ndjson> to also compare against a maintainer-supplied export.')
  }

  const failed = results.filter((result) => !result.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length > 0) {
    console.log(`Failed checks:\n${failed.map((f) => `  - ${f.name}`).join('\n')}`)
    process.exitCode = 1
  }
}

await main()
