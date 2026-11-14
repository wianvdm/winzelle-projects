import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error the script ships no type declarations
import * as prMetadata from './pr-metadata.mjs'

const {
  AREA_LABELS,
  AUTOMATION_LOGINS,
  DEPENDABOT_LOGIN,
  MAINTAINERS,
  TYPE_LABELS,
  buildInput,
  computeNoIssue,
  evaluatePrMetadata,
  fetchClosingIssue,
  fetchTimeline,
  parseClosingReferences,
} = prMetadata

type ClosingIssue = {
  number: number
  missing: boolean
  state?: string
  isPullRequest?: boolean
  hasSubIssues?: boolean
}

type PrInput = {
  title: string
  labels: string[]
  authorLogin: string
  closingIssues: ClosingIssue[]
  noIssue: { appliedBy: string | null; appliedAfterLatestCommit: boolean }
}

function openIssue(number = 7): ClosingIssue {
  return {
    number,
    missing: false,
    state: 'open',
    isPullRequest: false,
    hasSubIssues: false,
  }
}

function validInput(overrides: Partial<PrInput> = {}): PrInput {
  return {
    title: 'feat(forms): add contact form',
    labels: ['type:feature', 'area:forms'],
    authorLogin: 'someone',
    closingIssues: [openIssue()],
    noIssue: { appliedBy: null, appliedAfterLatestCommit: false },
    ...overrides,
  }
}

describe('exported constants', () => {
  it('exposes the contract label lists and logins', () => {
    expect(TYPE_LABELS).toHaveLength(6)
    expect(AREA_LABELS).toHaveLength(9)
    expect(MAINTAINERS).toEqual(['WianVDM'])
    expect(DEPENDABOT_LOGIN).toBe('dependabot[bot]')
    expect(AUTOMATION_LOGINS).toEqual([])
  })
})

describe('evaluatePrMetadata decision matrix', () => {
  it('passes a valid PR', () => {
    const result = evaluatePrMetadata(validInput())
    expect(result).toEqual({ ok: true, errors: [] })
  })

  it('fails when the closing reference is missing', () => {
    const result = evaluatePrMetadata(validInput({ closingIssues: [] }))
    expect(result.ok).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/close exactly one issue/)
  })

  it('fails with two closing references', () => {
    const result = evaluatePrMetadata(
      validInput({ closingIssues: [openIssue(7), openIssue(8)] }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/found 2 closing references/)
  })

  it('fails when the closing issue is closed', () => {
    const result = evaluatePrMetadata(
      validInput({ closingIssues: [{ ...openIssue(), state: 'closed' }] }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/not open/)
  })

  it('fails when the closing reference is a pull request', () => {
    const result = evaluatePrMetadata(
      validInput({ closingIssues: [{ ...openIssue(), isPullRequest: true }] }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/pull request/)
  })

  it('fails when the closing issue is a parent with sub-issues', () => {
    const result = evaluatePrMetadata(
      validInput({ closingIssues: [{ ...openIssue(), hasSubIssues: true }] }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/sub-issues/)
  })

  it('fails with zero type labels', () => {
    const result = evaluatePrMetadata(validInput({ labels: ['area:forms'] }))
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/exactly one type label/)
  })

  it('fails with two type labels', () => {
    const result = evaluatePrMetadata(
      validInput({ labels: ['type:feature', 'type:bug', 'area:forms'] }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/type:feature, type:bug/)
  })

  it('fails with no area label', () => {
    const result = evaluatePrMetadata(validInput({ labels: ['type:feature'] }))
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/at least one area label/)
  })

  it('fails with a non-conventional title', () => {
    const result = evaluatePrMetadata(validInput({ title: 'Add contact form' }))
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/Conventional Commits/)
  })

  it('passes for Dependabot with dependencies and no issue', () => {
    const result = evaluatePrMetadata(
      validInput({
        authorLogin: 'dependabot[bot]',
        labels: ['type:maintenance', 'area:dependencies', 'dependencies'],
        closingIssues: [],
      }),
    )
    expect(result).toEqual({ ok: true, errors: [] })
  })

  it('fails for a human author with dependencies and no issue', () => {
    const result = evaluatePrMetadata(
      validInput({
        labels: ['type:maintenance', 'area:dependencies', 'dependencies'],
        closingIssues: [],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toMatch(/dependencies/)
  })

  it('fails when automated is used by an author not in AUTOMATION_LOGINS', () => {
    const result = evaluatePrMetadata(
      validInput({
        labels: ['type:maintenance', 'area:ci', 'automated'],
        closingIssues: [],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/automated/)
  })

  it('passes when no-issue is applied by WianVDM after the latest commit', () => {
    const result = evaluatePrMetadata(
      validInput({
        labels: ['type:docs', 'area:repo', 'no-issue'],
        closingIssues: [],
        noIssue: { appliedBy: 'WianVDM', appliedAfterLatestCommit: true },
      }),
    )
    expect(result).toEqual({ ok: true, errors: [] })
  })

  it('fails when no-issue is applied by someone else', () => {
    const result = evaluatePrMetadata(
      validInput({
        labels: ['type:docs', 'area:repo', 'no-issue'],
        closingIssues: [],
        noIssue: { appliedBy: 'random-user', appliedAfterLatestCommit: true },
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/no-issue/)
  })

  it('fails when no-issue is applied before the latest commit', () => {
    const result = evaluatePrMetadata(
      validInput({
        labels: ['type:docs', 'area:repo', 'no-issue'],
        closingIssues: [],
        noIssue: { appliedBy: 'WianVDM', appliedAfterLatestCommit: false },
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/no-issue/)
  })

  it('passes when the maintainer login uses the API casing wianvdm', () => {
    const result = evaluatePrMetadata(
      validInput({
        labels: ['type:docs', 'area:repo', 'no-issue'],
        closingIssues: [],
        noIssue: { appliedBy: 'wianvdm', appliedAfterLatestCommit: true },
      }),
    )
    expect(result).toEqual({ ok: true, errors: [] })
  })

  it('passes for Dependabot with the API casing Dependabot[bot]', () => {
    const result = evaluatePrMetadata(
      validInput({
        authorLogin: 'Dependabot[bot]',
        labels: ['type:maintenance', 'area:dependencies', 'dependencies'],
        closingIssues: [],
      }),
    )
    expect(result).toEqual({ ok: true, errors: [] })
  })

  it('reports a rule error when the closing issue does not exist', () => {
    const result = evaluatePrMetadata(
      validInput({ closingIssues: [{ number: 42, missing: true }] }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(['closing issue #42 does not exist'])
  })
})

describe('parseClosingReferences', () => {
  it('parses Closes/fixes/RESOLVES case-insensitively', () => {
    expect(
      parseClosingReferences('Closes #1, fixes #2 and RESOLVES #3'),
    ).toEqual([1, 2, 3])
  })

  it('ignores #N without a closing keyword', () => {
    expect(parseClosingReferences('Related to #4. Closes #5')).toEqual([5])
  })

  it('deduplicates repeated references', () => {
    expect(parseClosingReferences('Fixes #6, fixes #6')).toEqual([6])
  })

  it('accepts a colon after the keyword', () => {
    expect(parseClosingReferences('Closes: #10')).toEqual([10])
  })

  it('ignores references inside HTML comments', () => {
    expect(parseClosingReferences('<!-- Closes #11 --> Closes #12')).toEqual([
      12,
    ])
  })

  it('ignores references inside fenced code blocks', () => {
    expect(parseClosingReferences('```\nCloses #13\n```\nCloses #14')).toEqual([
      14,
    ])
  })

  it('counts references inside inline code, failing safe', () => {
    expect(parseClosingReferences('`Closes #15` and closes #16')).toEqual([
      15, 16,
    ])
  })

  it('ignores references inside tilde fences', () => {
    expect(parseClosingReferences('~~~\nCloses #17\n~~~\nCloses #18')).toEqual([
      18,
    ])
  })

  it('does not let mid-line markers hide references across paragraphs', () => {
    expect(parseClosingReferences('Closes #7 ```\n\nCloses #1\n\n```')).toEqual(
      [1, 7],
    )
    expect(
      parseClosingReferences('Closes #7 <!--\n\nCloses #1\n\n-->'),
    ).toEqual([1, 7])
    expect(parseClosingReferences('Closes #7 `x\n\nCloses #1\n\ny`')).toEqual([
      1, 7,
    ])
  })
})

describe('computeNoIssue', () => {
  it('reports the last no-issue label after the latest commit', () => {
    const timeline = [
      { event: 'committed' },
      {
        event: 'labeled',
        label: { name: 'no-issue' },
        actor: { login: 'WianVDM' },
      },
    ]
    expect(computeNoIssue(timeline)).toEqual({
      appliedBy: 'WianVDM',
      appliedAfterLatestCommit: true,
    })
  })

  it('is not after the latest commit when a commit follows the label', () => {
    const timeline = [
      {
        event: 'labeled',
        label: { name: 'no-issue' },
        actor: { login: 'WianVDM' },
      },
      { event: 'committed' },
    ]
    expect(computeNoIssue(timeline)).toEqual({
      appliedBy: 'WianVDM',
      appliedAfterLatestCommit: false,
    })
  })

  it('treats head_ref_force_pushed as a new commit', () => {
    const timeline = [
      {
        event: 'labeled',
        label: { name: 'no-issue' },
        actor: { login: 'WianVDM' },
      },
      { event: 'head_ref_force_pushed' },
    ]
    expect(computeNoIssue(timeline).appliedAfterLatestCommit).toBe(false)
  })

  it('uses the last no-issue labeled event', () => {
    const timeline = [
      {
        event: 'labeled',
        label: { name: 'no-issue' },
        actor: { login: 'other' },
      },
      { event: 'committed' },
      {
        event: 'labeled',
        label: { name: 'no-issue' },
        actor: { login: 'WianVDM' },
      },
    ]
    expect(computeNoIssue(timeline)).toEqual({
      appliedBy: 'WianVDM',
      appliedAfterLatestCommit: true,
    })
  })

  it('ignores labels other than no-issue', () => {
    const timeline = [
      { event: 'committed' },
      {
        event: 'labeled',
        label: { name: 'type:bug' },
        actor: { login: 'WianVDM' },
      },
    ]
    expect(computeNoIssue(timeline)).toEqual({
      appliedBy: null,
      appliedAfterLatestCommit: false,
    })
  })
})

type StubResponse = { status?: number; body?: unknown }

function stubFetch(handler: (url: string) => StubResponse): string[] {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url)
    const { status = 200, body = {} } = handler(url)
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: `status ${status}`,
      json: async () => body,
    }
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const REPO = 'wianvdm/winzelle-projects'
const TOKEN = 'test-token'

function livePr(overrides: Record<string, unknown> = {}) {
  return {
    title: 'feat(forms): add contact form',
    body: 'Closes #7',
    labels: [{ name: 'type:feature' }, { name: 'area:forms' }],
    user: { login: 'someone' },
    ...overrides,
  }
}

function issueBody(number: number, overrides: Record<string, unknown> = {}) {
  return {
    state: 'open',
    sub_issues_summary: { total: 0 },
    ...overrides,
    number,
  }
}

describe('fetchClosingIssue with stubbed fetch', () => {
  it('returns a missing entry on a 404 so the rule error can report it', async () => {
    stubFetch(() => ({ status: 404 }))
    await expect(fetchClosingIssue(REPO, 42, TOKEN)).resolves.toEqual({
      number: 42,
      missing: true,
    })
  })

  it('throws on other API errors such as a 500', async () => {
    stubFetch(() => ({ status: 500 }))
    await expect(fetchClosingIssue(REPO, 42, TOKEN)).rejects.toThrow(/500/)
  })

  it('fails closed when sub_issues_summary is missing', async () => {
    stubFetch(() => ({ body: { state: 'open' } }))
    await expect(fetchClosingIssue(REPO, 42, TOKEN)).rejects.toThrow(
      /sub_issues_summary/,
    )
  })
})

describe('buildInput with stubbed fetch', () => {
  it('uses the live PR response, not the event payload', async () => {
    const event = {
      pull_request: {
        number: 5,
        title: 'stale title',
        body: 'stale body',
        labels: [],
        user: { login: 'stale-user' },
      },
    }
    stubFetch((url) => {
      if (url.includes('/pulls/')) return { body: livePr() }
      if (url.includes('/timeline')) return { body: [] }
      if (url.includes('/issues/7')) return { body: issueBody(7) }
      throw new Error(`unexpected fetch: ${url}`)
    })
    const input = await buildInput(event, TOKEN, REPO)
    expect(input.title).toBe('feat(forms): add contact form')
    expect(input.labels).toEqual(['type:feature', 'area:forms'])
    expect(input.authorLogin).toBe('someone')
    expect(input.closingIssues).toHaveLength(1)
    expect(input.closingIssues[0].number).toBe(7)
  })

  it('makes no issue fetch when an exemption applies', async () => {
    const event = { pull_request: { number: 5 } }
    const calls = stubFetch((url) => {
      if (url.includes('/pulls/')) {
        return {
          body: livePr({
            body: 'Closes #7',
            labels: [
              { name: 'type:maintenance' },
              { name: 'area:dependencies' },
              { name: 'dependencies' },
            ],
            user: { login: 'dependabot[bot]' },
          }),
        }
      }
      if (url.includes('/timeline')) return { body: [] }
      throw new Error(`unexpected fetch: ${url}`)
    })
    const input = await buildInput(event, TOKEN, REPO)
    expect(input.closingIssues).toEqual([])
    expect(calls.some((url) => url.includes('/issues/7'))).toBe(false)
  })
})

describe('fetchTimeline with stubbed fetch', () => {
  it('paginates across two pages', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      event: 'committed',
      sha: `sha-${index}`,
    }))
    stubFetch((url) => {
      if (url.includes('&page=1')) return { body: firstPage }
      if (url.includes('&page=2')) {
        return { body: [{ event: 'labeled', label: { name: 'no-issue' } }] }
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    const events = await fetchTimeline(REPO, 5, TOKEN)
    expect(events).toHaveLength(101)
    expect(events[100].event).toBe('labeled')
  })
})
