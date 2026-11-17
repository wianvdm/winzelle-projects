// Placeholder values (suburbs, months, the service-area line) stay flagged
// until #102 replaces them with confirmed facts. The filler() call keeps each
// one machine-detectable: scripts/check-filler.mjs scans for filler( call
// sites and fails a production build that enables /next while any remain.

declare const fillerBrand: unique symbol

export type Filler<T extends string = string> = T & {
  readonly [fillerBrand]: true
}

export const fillerValues = new Set<string>()

export function filler<T extends string>(value: T): Filler<T> {
  fillerValues.add(value)
  return value as Filler<T>
}
