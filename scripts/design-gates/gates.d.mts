// Declarations for gates.mjs so the vitest suite typechecks under tsc --noEmit.

export type GateStatus = 'pass' | 'fail' | 'manual' | 'skipped' | 'unknown'

export interface Gate {
  id: string
  title: string
  status: GateStatus
  summary: string
  failures: unknown[]
  manual: unknown[]
  pending?: unknown[]
  [key: string]: unknown
}

export interface RequestVerdict {
  allowed: boolean
  kind: string
  reason?: string
}

export interface ProbeViewport {
  width: number
  height: number
  mobile: boolean
}

export const VIEWPORTS: Record<number, ProbeViewport>
export const REFLOW_WIDTHS: number[]

export interface ProbeResult {
  page: string
  gates: Record<string, Gate>
  [key: string]: unknown
}

export interface GateOutcome {
  ok: boolean
  failed: string[]
  unknown: string[]
  skipped: string[]
  manual: string[]
  screenshots: string[]
}

export function classifyRequest(
  rawUrl: string,
  pageOrigin: string,
): RequestVerdict
export function gateOutcome(result: ProbeResult): GateOutcome
export function finalise(data: {
  parts: Record<string, unknown>
  errors: Record<string, string[]>
  log: { console: unknown[]; requests: unknown[]; probeNotes: string[] }
  survey?: Record<string, unknown> | null
  page: string
  chrome: string | null
  startedAt: string
  finishedAt?: string
  screenshots?: unknown[]
}): ProbeResult
