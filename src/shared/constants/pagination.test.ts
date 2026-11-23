import { describe, expect, it } from 'vitest'
import { VISIBLE_PAGE_COUNT } from './pagination'

describe('pagination constants', () => {
  // `buildPagination` slices a window of this size out of the page list, so a
  // fractional or non-positive count would produce an empty or ragged window.
  it('stays a positive integer', () => {
    expect(Number.isInteger(VISIBLE_PAGE_COUNT)).toBe(true)
    expect(VISIBLE_PAGE_COUNT).toBeGreaterThan(0)
  })
})
