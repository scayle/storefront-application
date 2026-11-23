import { describe, expect, it } from 'vitest'
import { extractBlocks } from './blocks'

describe('extractBlocks', () => {
  it('returns the array when content is defined', () => {
    const items = [{ _uid: 'a' }, { _uid: 'b' }]

    expect(extractBlocks(items)).toEqual(items)
  })

  it('returns empty array when content is undefined', () => {
    expect(extractBlocks(undefined)).toEqual([])
  })

  it('returns empty array for non-array values', () => {
    // @ts-expect-error -- testing runtime safety with invalid input
    expect(extractBlocks('not-an-array')).toEqual([])
  })
})
