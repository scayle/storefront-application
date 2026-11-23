import { describe, expect, it } from 'vitest'
import { clamp, mapNumberToRange, roundDown, roundUp, wrapIndex } from './math'

describe('clamp', () => {
  it.for([
    [5, 0, 10, 5],
    [-3, 0, 10, 0],
    [15, 0, 10, 10],
  ] as const)('clamps %d to [%d, %d] as %d', ([value, min, max, expected]) => {
    expect(clamp(value, min, max)).toBe(expected)
  })
})

describe('roundDown', () => {
  it.for([
    [7, 5, 5],
    [9, 5, 5],
    [22.22, 4, 20],
    [100101, 100, 100100],
    [-17, 4, -20],
    [10, 10, 10],
    [10, 0, Number.NaN],
    [10, -5, Number.NaN],
    [10, Number.NaN, Number.NaN],
  ] as const)(
    'rounds %d down to the interval %d as %d',
    ([value, interval, expected]) => {
      expect(roundDown(value, interval)).toBe(expected)
    },
  )
})

describe('roundUp', () => {
  it.for([
    [7, 5, 10],
    [9, 5, 10],
    [22.22, 4, 24],
    [100101, 100, 100200],
    [-17, 4, -16],
    [10, 10, 10],
    [10, 0, Number.NaN],
    [10, -5, Number.NaN],
    [10, Number.NaN, Number.NaN],
  ] as const)(
    'rounds %d up to the interval %d as %d',
    ([value, interval, expected]) => {
      expect(roundUp(value, interval)).toBe(expected)
    },
  )
})

describe('mapNumberToRange', () => {
  it('should map a number within the same range (identity)', () => {
    expect(mapNumberToRange(50, 0, 100, 0, 100)).toEqual(50)
    expect(mapNumberToRange(0, 0, 100, 0, 100)).toEqual(0)
    expect(mapNumberToRange(100, 0, 100, 0, 100)).toEqual(100)
  })

  it('should map a number from one range to another linearly', () => {
    expect(mapNumberToRange(50, 0, 100, 0, 10)).toEqual(5)
    expect(mapNumberToRange(25, 0, 100, 0, 1)).toEqual(0.25)
    expect(mapNumberToRange(0, 0, 100, 10, 20)).toEqual(10)
    expect(mapNumberToRange(100, 0, 100, 10, 20)).toEqual(20)
  })

  it('should clamp values outside the input range to the output range', () => {
    expect(mapNumberToRange(-10, 0, 100, 0, 10)).toEqual(0)
    expect(mapNumberToRange(150, 0, 100, 0, 10)).toEqual(10)
    expect(mapNumberToRange(5, 10, 20, 0, 100)).toEqual(0)
    expect(mapNumberToRange(25, 10, 20, 0, 100)).toEqual(100)
  })

  it('should handle negative input and output ranges', () => {
    expect(mapNumberToRange(-50, -100, 0, 0, 10)).toEqual(5)
    expect(mapNumberToRange(0, -100, 100, -10, 10)).toEqual(0)
    expect(mapNumberToRange(-100, -100, 0, 0, 10)).toEqual(0)
  })

  it('should map boundary values correctly', () => {
    expect(mapNumberToRange(0, 0, 100, 0, 1)).toEqual(0)
    expect(mapNumberToRange(100, 0, 100, 0, 1)).toEqual(1)
    expect(mapNumberToRange(50, 0, 100, 100, 200)).toEqual(150)
  })
})

describe('wrapIndex', () => {
  it('returns in-range indices unchanged', () => {
    expect(wrapIndex(0, 3)).toEqual(0)
    expect(wrapIndex(1, 3)).toEqual(1)
    expect(wrapIndex(2, 3)).toEqual(2)
  })

  it('wraps past the end to the front', () => {
    expect(wrapIndex(3, 3)).toEqual(0)
    expect(wrapIndex(4, 3)).toEqual(1)
  })

  it('wraps before the start to the end', () => {
    expect(wrapIndex(-1, 3)).toEqual(2)
    expect(wrapIndex(-2, 3)).toEqual(1)
  })

  it('returns 0 for an empty range', () => {
    expect(wrapIndex(0, 0)).toEqual(0)
    expect(wrapIndex(5, 0)).toEqual(0)
  })
})
