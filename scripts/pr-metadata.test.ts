import { describe, expect, it } from 'vitest'
// @ts-expect-error the script ships no type declarations
import * as prMetadata from './pr-metadata.mjs'

const {
  AREA_LABELS,
  AUTOMATION_LOGINS,
  DEPENDABOT_LOGIN,
  MAINTAINERS,
  TYPE_LABELS,
  computeNoIssue,
  evaluatePrMetadata,
  parseClosingReferences,
} = prMetadata

type ClosingIssue = {
  number: number
  state: string
  isPullRequest: boolean
  hasSubIssues: boolean
}

type PrInput = {
  title: string
  labels: string[]
  authorLogin: string
  closingIssues: ClosingIssue[]
  noIssue: { appliedBy: string | null; appliedAfterLatestCommit: boolean }
}

function openIssue(number = 7): ClosingIssue {
  return { number, state: 'open', isPullRequest: false, hasSubIssues: false }
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
