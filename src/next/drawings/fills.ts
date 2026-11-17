// Seeded material fills for the surveyor drawings (spec S3). Pure functions:
// the same seed always yields the same shapes, so a drawing renders identically
// on every load and several instances can share one page.

export type Box = readonly [x: number, y: number, width: number, height: number]

export type StonePalette = 'stone' | 'soil'

export interface Stone {
  points: string
  fill: string
}

export interface Brick {
  x: number
  y: number
  width: number
  height: number
  fill: string
}

export interface Paver {
  x: number
  y: number
  width: number
  height: number
  fill: string
  /** SVG rotate() transform keeping the paver's edges on the dip curve. */
  rotate: string
}

export interface SlopeTile {
  points: string
  fill: string
  slipped: boolean
}

export interface Slope {
  /** Rafter outline in slope-local units, plumb-cut at the foot. */
  rafter: string
  /** Batten x positions in slope-local units. */
  battens: number[]
  /** Lower courses first, so each tile's tail lies over the course below. */
  tiles: SlopeTile[]
}

const PALETTES: Record<StonePalette, string[]> = {
  stone: [
    '#6d7275',
    '#888b89',
    '#5a636c',
    '#a9a091',
    '#787165',
    '#c1bbb0',
    '#50565a',
    '#8c7e6c',
    '#6e7e8b',
  ],
  soil: ['#7a644a', '#8d7656', '#6b5841', '#9b8667', '#5f4e3a'],
}
const BRICK_COLOURS = ['#955d4c', '#864f3f', '#a26a57', '#7d4c3e', '#8f5747']
const PAVER_COLOURS = ['#a9aba8', '#9c9f9d', '#b3b4b0', '#a2a4a0']
const TILE_COLOURS = ['#7f5245', '#764b3f', '#86584a']

// How far a plumb cut runs along a 22-deep rafter at the drawn roof's 34.7°
// pitch (22 × tan 34.7°).
const PLUMB_CUT_RUN = 15.2
// Roof tiles in slope units: batten spacing, tile length, thickness, and how
// far a tail sits up on the course below.
const TILE_GAUGE = 34
const TILE_LENGTH = 38
const TILE_THICKNESS = 6
const TILE_RISE = 6.6
const STONE_MIN_RADIUS = 1.4
const STONE_SPACING = 1.1
const STONE_ATTEMPTS_PER_STONE = 28
const PAVER_GAP = 2

/** Deterministic 32-bit generator (mulberry32); same seed, same sequence. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)]
}

function stonePoints(
  rand: () => number,
  cx: number,
  cy: number,
  r: number,
): string {
  const squash = 0.65 + 0.35 * rand()
  const turn = rand() * Math.PI
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = ((i + rand() * 0.55) / 6) * Math.PI * 2
    const radius = r * (0.7 + 0.4 * rand())
    const dx = Math.cos(angle) * radius
    const dy = Math.sin(angle) * radius * squash
    points.push(
      `${(cx + dx * Math.cos(turn) - dy * Math.sin(turn)).toFixed(1)},${(
        cy +
        dx * Math.sin(turn) +
        dy * Math.cos(turn)
      ).toFixed(1)}`,
    )
  }
  return points.join(' ')
}

/** Scattered stones for soil, a compacted base or cast concrete. */
export function stones(options: {
  box: Box
  count: number
  seed: number
  maxRadius: number
  palette?: StonePalette
}): Stone[] {
  const { box, count, seed, maxRadius } = options
  const colours = PALETTES[options.palette ?? 'stone']
  const rand = seeded(seed)
  const placed: { x: number; y: number; r: number }[] = []
  const result: Stone[] = []
  for (
    let attempt = 0;
    attempt < count * STONE_ATTEMPTS_PER_STONE && placed.length < count;
    attempt++
  ) {
    const r =
      STONE_MIN_RADIUS + (maxRadius - STONE_MIN_RADIUS) * Math.pow(rand(), 1.6)
    const cx = box[0] + rand() * box[2]
    const cy = box[1] + rand() * box[3]
    const overlaps = placed.some(
      (p) => Math.hypot(p.x - cx, p.y - cy) < p.r + r + STONE_SPACING,
    )
    if (overlaps) continue
    placed.push({ x: cx, y: cy, r })
    result.push({
      points: stonePoints(rand, cx, cy, r),
      fill: pick(rand, colours),
    })
  }
  return result
}

/** A cut through a 230 wall: courses alternate two stretchers and one header. */
export function bricks(options: {
  box: Box
  pitch: number
  seed: number
}): Brick[] {
  const { box, pitch, seed } = options
  const rand = seeded(seed)
  const joint = pitch * 0.16
  const height = pitch - joint
  const half = (box[2] - 3 * joint) / 2
  const result: Brick[] = []
  for (let row = 0; box[1] + row * pitch < box[1] + box[3]; row++) {
    const y = box[1] + joint / 2 + row * pitch
    const widths = row % 2 === 0 ? [half, half] : [box[2] - 2 * joint]
    let x = box[0] + joint
    for (const width of widths) {
      result.push({ x, y, width, height, fill: pick(rand, BRICK_COLOURS) })
      x += width + joint
    }
  }
  return result
}

/** Pavers in a row; an optional dip shows paving sunk over a weak base. */
export function pavers(options: {
  box: Box
  width: number
  dip?: readonly [from: number, to: number, depth: number]
}): Paver[] {
  const { box, width, dip } = options
  const rand = seeded(61)
  const drop = (x: number) => {
    if (!dip || x < dip[0] || x > dip[1]) return 0
    return dip[2] * Math.sin((Math.PI * (x - dip[0])) / (dip[1] - dip[0]))
  }
  const result: Paver[] = []
  for (
    let x = box[0];
    x + width <= box[0] + box[2] + 0.1;
    x += width + PAVER_GAP
  ) {
    const left = drop(x)
    const right = drop(x + width)
    const centre = drop(x + width / 2)
    const tilt = (Math.atan2(right - left, width) * 180) / Math.PI
    result.push({
      x,
      y: box[1] + centre,
      width,
      height: box[3],
      fill: pick(rand, PAVER_COLOURS),
      rotate: `rotate(${tilt.toFixed(2)} ${x + width / 2} ${box[1] + centre + box[3] / 2})`,
    })
  }
  return result
}

/**
 * One roof slope in local units: the rafter below the line, battens and lapped
 * tiles above it. The rafter foot is cut plumb to take the fascia; tiles run
 * from the ridge to just past the foot, each hanging on its batten with its
 * tail resting on the course below. `slip` marks one tile as slipped.
 */
export function slope(options: { length: number; slip?: number }): Slope {
  const { length } = options
  const slip = options.slip ?? -1
  const rand = seeded(length + (slip > 0 ? 5 : 1))
  const rafter = `M14 -22H${length + PLUMB_CUT_RUN}L${length} 0H14Z`
  const battens: number[] = []
  for (let x = 0; x + 36 <= length + 8; x += TILE_GAUGE) {
    battens.push(Math.max(x + 2, 14))
  }
  const tiles: SlopeTile[] = []
  for (let index = battens.length - 1; index >= 0; index--) {
    const head = index * TILE_GAUGE
    const tail = head + TILE_LENGTH
    tiles.push({
      points: `${head},5 ${tail},${5 + TILE_RISE} ${tail},${5 + TILE_RISE + TILE_THICKNESS} ${head},${5 + TILE_THICKNESS}`,
      fill: pick(rand, TILE_COLOURS),
      slipped: index === slip,
    })
  }
  return { rafter, battens, tiles }
}
