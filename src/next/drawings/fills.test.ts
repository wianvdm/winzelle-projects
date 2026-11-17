import { describe, expect, it } from 'vitest'

import { bricks, pavers, slope, stones } from './fills'

describe('stones', () => {
  it('is deterministic for a seed', () => {
    const options = {
      box: [2, 276, 596, 82] as const,
      count: 60,
      seed: 43,
      maxRadius: 3.4,
      palette: 'soil' as const,
    }
    expect(stones(options)).toEqual(stones(options))
  })

  it('differs between seeds', () => {
    const options = {
      box: [21, 233, 438, 38] as const,
      count: 190,
      maxRadius: 4,
    }
    expect(stones({ ...options, seed: 47 })).not.toEqual(
      stones({ ...options, seed: 48 }),
    )
  })

  it('places the requested count within the box', () => {
    const result = stones({
      box: [21, 233, 438, 38],
      count: 190,
      seed: 47,
      maxRadius: 4,
    })
    expect(result).toHaveLength(190)
    for (const stone of result) {
      for (const point of stone.points.split(' ')) {
        const [x, y] = point.split(',').map(Number)
        expect(x).toBeGreaterThan(21 - 4)
        expect(x).toBeLessThan(21 + 438 + 4)
        expect(y).toBeGreaterThan(233 - 4)
        expect(y).toBeLessThan(233 + 38 + 4)
      }
    }
  })
})

describe('bricks', () => {
  it('is deterministic for a seed and alternates stretchers with a header', () => {
    const options = { box: [84, 250, 34, 112] as const, pitch: 13.7, seed: 5 }
    const result = bricks(options)
    expect(result).toEqual(bricks(options))
    expect(result.length).toBeGreaterThan(0)
    // Even courses carry two stretchers, odd courses one header.
    const rows = new Map<number, number>()
    for (const brick of result) rows.set(brick.y, (rows.get(brick.y) ?? 0) + 1)
    const counts = [...rows.values()]
    expect(counts[0]).toBe(2)
    expect(counts[1]).toBe(1)
  })
})

describe('pavers', () => {
  it('lays a level row without a dip', () => {
    const result = pavers({ box: [20, 196, 440, 24], width: 52 })
    expect(result).toEqual(pavers({ box: [20, 196, 440, 24], width: 52 }))
    expect(result.length).toBeGreaterThan(0)
    for (const paver of result) {
      expect(paver.y).toBe(196)
      expect(paver.rotate).toMatch(/^rotate\(0\.00 /)
    }
  })

  it('drops and tilts pavers across a dip', () => {
    const result = pavers({
      box: [20, 196, 440, 24],
      width: 52,
      dip: [160, 370, 13],
    })
    const dipped = result.filter((paver) => paver.y !== 196)
    expect(dipped.length).toBeGreaterThan(0)
    expect(Math.max(...result.map((paver) => paver.y))).toBeCloseTo(209, 0)
    expect(
      result.some((paver) => !paver.rotate.startsWith('rotate(0.00')),
    ).toBe(true)
  })
})

describe('slope', () => {
  it('is deterministic for a length and marks no slipped tile by default', () => {
    expect(slope({ length: 300 })).toEqual(slope({ length: 300 }))
    expect(slope({ length: 300 }).tiles.every((tile) => !tile.slipped)).toBe(
      true,
    )
  })

  it('marks exactly the slipped tile and uses a different sequence for it', () => {
    const slipped = slope({ length: 300, slip: 5 })
    expect(slipped.tiles.filter((tile) => tile.slipped)).toHaveLength(1)
    expect(slipped.tiles[5].slipped).toBe(true)
    expect(slipped).not.toEqual(slope({ length: 300 }))
  })

  it('hangs one tile per batten, courses lapping down the slope', () => {
    const result = slope({ length: 300 })
    expect(result.battens).toHaveLength(9)
    expect(result.tiles).toHaveLength(9)
    expect(result.battens[0]).toBe(14)
    expect(result.battens[1]).toBe(36)
  })
})
