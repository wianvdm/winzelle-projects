// Enforces the pull request rules in CLAUDE.md: a Conventional Commit title,
// exactly one type label, at least one area label, and one open leaf issue to
// close unless a valid exemption label applies.

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const TYPE_LABELS = [
  'type:bug',
  'type:feature',
  'type:maintenance',
  'type:docs',
  'type:content',
  'type:security',
]

export const AREA_LABELS = [
  'area:ci',
  'area:release',
  'area:dependencies',
  'area:repo',
  'area:frontend',
  'area:forms',
  'area:content',
  'area:cloudflare',
  'area:seo',
]

export const MAINTAINERS = ['WianVDM']
export const DEPENDABOT_LOGIN = 'dependabot[bot]'
export const AUTOMATION_LOGINS = []

const TIMELINE_PAGE_SIZE = 100

const TITLE_PATTERN =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9-]+\))?!?: \S/
const CLOSING_PATTERN =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi

export function parseClosingReferences(body) {
  if (typeof body !== 'string') return []
  const numbers = new Set()
  for (const match of body.matchAll(CLOSING_PATTERN)) {
    numbers.add(Number(match[1]))
  }
  return [...numbers].sort((a, b) => a - b)
}

export function computeNoIssue(timeline) {
  let lastNoIssueLabel = null
  let lastCommitIndex = -1
  timeline.forEach((event, index) => {
    if (event.event === 'labeled' && event.label?.name === 'no-issue') {
      lastNoIssueLabel = { actor: event.actor?.login ?? null, index }
    }
    if (
      event.event === 'committed' ||
      event.event === 'head_ref_force_pushed'
    ) {
      lastCommitIndex = index
    }
  })
  if (!lastNoIssueLabel)
    return { appliedBy: null, appliedAfterLatestCommit: false }
  return {
    appliedBy: lastNoIssueLabel.actor,
    appliedAfterLatestCommit: lastNoIssueLabel.index > lastCommitIndex,
  }
}

function evaluateExemptions(labels, input) {
  const errors = []
  const exempted = { dependencies: false, automated: false, 'no-issue': false }

  if (labels.has('dependencies')) {
    if (input.authorLogin === DEPENDABOT_LOGIN) {
      exempted.dependencies = true
    } else {
      errors.push(
        `the 'dependencies' exemption is only valid for PRs authored by ${DEPENDABOT_LOGIN}`,
      )
    }
  }
  if (labels.has('automated')) {
    if (AUTOMATION_LOGINS.includes(input.authorLogin)) {
      exempted.automated = true
    } else {
      errors.push(
        `the 'automated' exemption requires an author in AUTOMATION_LOGINS (got '${input.authorLogin}')`,
      )
    }
  }
  if (labels.has('no-issue')) {
    const { appliedBy, appliedAfterLatestCommit } = input.noIssue
    if (
      appliedBy !== null &&
      MAINTAINERS.includes(appliedBy) &&
      appliedAfterLatestCommit
    ) {
      exempted['no-issue'] = true
    } else {
      errors.push(
        `the 'no-issue' exemption requires a maintainer (${MAINTAINERS.join(', ')}) to apply the label after the latest commit`,
      )
    }
  }
  return {
    errors,
    exempt: exempted.dependencies || exempted.automated || exempted['no-issue'],
  }
}

function closingIssueErrors(closingIssues) {
  if (closingIssues.length === 0) {
    return [
      'the PR must close exactly one issue (e.g. "Closes #N" in the body)',
    ]
  }
  if (closingIssues.length > 1) {
    return [
      `the PR must close exactly one issue, found ${closingIssues.length} closing references`,
    ]
  }
  const issue = closingIssues[0]
  const errors = []
  if (issue.state !== 'open')
    errors.push(`closing issue #${issue.number} is not open`)
  if (issue.isPullRequest)
    errors.push(
      `closing reference #${issue.number} is a pull request, not an issue`,
    )
  if (issue.hasSubIssues)
    errors.push(
      `closing issue #${issue.number} has sub-issues; link a leaf issue instead`,
    )
  return errors
}

export function evaluatePrMetadata(input) {
  const errors = []
  const labels = new Set(input.labels)

  if (!TITLE_PATTERN.test(input.title)) {
    errors.push(
      'title must follow Conventional Commits, e.g. "feat(forms): add contact form"',
    )
  }

  const typeLabels = input.labels.filter((label) => TYPE_LABELS.includes(label))
  if (typeLabels.length === 0) {
    errors.push(
      `exactly one type label is required (${TYPE_LABELS.join(', ')})`,
    )
  } else if (typeLabels.length > 1) {
    errors.push(
      `exactly one type label is required, found: ${typeLabels.join(', ')}`,
    )
  }

  if (!input.labels.some((label) => AREA_LABELS.includes(label))) {
    errors.push(
      `at least one area label is required (${AREA_LABELS.join(', ')})`,
    )
  }

  const { errors: exemptionErrors, exempt } = evaluateExemptions(labels, input)
  errors.push(...exemptionErrors)

  if (!exempt) errors.push(...closingIssueErrors(input.closingIssues))

  return { ok: errors.length === 0, errors }
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) {
    throw new Error(
      `GET ${url} failed with ${response.status} ${response.statusText}`,
    )
  }
  return response.json()
}

export async function fetchClosingIssue(repo, number, token) {
  const issue = await fetchJson(
    `https://api.github.com/repos/${repo}/issues/${number}`,
    token,
  )
  return {
    number,
    state: issue.state,
    isPullRequest: Boolean(issue.pull_request),
    hasSubIssues: (issue.sub_issues_summary?.total ?? 0) > 0,
  }
}

export async function fetchTimeline(repo, prNumber, token) {
  const events = []
  let page = 1
  for (;;) {
    const batch = await fetchJson(
      `https://api.github.com/repos/${repo}/issues/${prNumber}/timeline?per_page=${TIMELINE_PAGE_SIZE}&page=${page}`,
      token,
    )
    events.push(...batch)
    if (batch.length < TIMELINE_PAGE_SIZE) return events
    page += 1
  }
}

async function buildInput(event, token, repository) {
  const pr = event.pull_request
  const closingNumbers = parseClosingReferences(pr.body)
  const closingIssues = await Promise.all(
    closingNumbers.map((number) =>
      fetchClosingIssue(repository, number, token),
    ),
  )
  const timeline = await fetchTimeline(repository, pr.number, token)
  return {
    title: pr.title,
    labels: pr.labels.map((label) => label.name),
    authorLogin: pr.user.login,
    closingIssues,
    noIssue: computeNoIssue(timeline),
  }
}

async function main() {
  const { GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env
  if (!GITHUB_EVENT_PATH || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.error(
      '::error::GITHUB_EVENT_PATH, GITHUB_TOKEN and GITHUB_REPOSITORY are required',
    )
    process.exit(1)
  }
  const event = JSON.parse(await readFile(GITHUB_EVENT_PATH, 'utf8'))
  const input = await buildInput(event, GITHUB_TOKEN, GITHUB_REPOSITORY)
  const { ok, errors } = evaluatePrMetadata(input)
  for (const error of errors) {
    console.error(`::error::${error}`)
  }
  console.log(
    ok
      ? 'PR metadata check passed.'
      : `PR metadata check failed with ${errors.length} error(s).`,
  )
  process.exit(ok ? 0 : 1)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`::error::${error.message}`)
    process.exit(1)
  })
}
