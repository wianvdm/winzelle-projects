// Fixture for scripts/check-filler.test.ts: the guard must flag this file.
// Lives outside src/ so the real build scan never sees it.

import { filler } from '../../../src/content/next/filler.ts'

export const fixturePlaceholder = filler('Placeholder suburb')
