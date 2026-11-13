import { describe, expect, it } from 'vitest'

import { services } from './index.ts'

describe('services content', () => {
  it('has unique ids and ascending displayOrder', () => {
    const ids = services.map((service) => service.id)
    expect(new Set(ids).size).toBe(ids.length)

    const orders = services.map((service) => service.displayOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
