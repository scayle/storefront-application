import { describe, expect, it } from 'vitest'
import { toCurrencyUnits } from './price'

describe('toCurrencyUnits', () => {
  it.for([
    [undefined, undefined],
    [0, 0],
    [1, 0.01],
    [333, 3.33],
    [1999, 19.99],
  ] as const)('converts %s cents to %s currency units', ([cents, expected]) => {
    expect(toCurrencyUnits(cents)).toBe(expected)
  })

  // Money on the wire is integer minor units, so a fractional cent only reaches
  // this helper through an incorrectly computed amount. It rounds rather than propagating
  // a third decimal into the tracking payload.
  it('rounds a fractional cent amount to two decimal places', () => {
    expect(toCurrencyUnits(1999.4)).toBeCloseTo(19.99)
    expect(toCurrencyUnits(1999.5)).toBe(20)
  })
})
