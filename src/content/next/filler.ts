// Marks a placeholder value that still needs a confirmed fact. #102 replaced
// every placeholder the redesign started with; the filler() call keeps any
// new one machine-detectable: scripts/check-filler.mjs scans for filler( call
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
