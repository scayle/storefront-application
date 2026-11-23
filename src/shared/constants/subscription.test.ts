import { describe, expect, it } from 'vitest'
import { PREFERRED_DELIVERY_DAYS } from './subscription'

describe('subscription constants', () => {
  // A customer picks one of these as a day of every month, so a day past 28
  // would be unreachable in February.
  it('keeps every day valid in every month', () => {
    for (const day of PREFERRED_DELIVERY_DAYS) {
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(28)
    }
  })

  it('lists the days in ascending order without repeats', () => {
    expect(PREFERRED_DELIVERY_DAYS.toSorted((a, b) => a - b)).toEqual([
      ...PREFERRED_DELIVERY_DAYS,
    ])
    expect(new Set(PREFERRED_DELIVERY_DAYS).size).toBe(
      PREFERRED_DELIVERY_DAYS.length,
    )
  })
})
