import { describe, expect, it } from 'vitest'
import type { AmplienceBlock } from '@shared/types/cms/amplience'
import { extractBlocks, getBlockKey } from './blocks'

describe('extractBlocks', () => {
  it('returns the array when content is defined', () => {
    const items = [{ componentType: 'text' }, { componentType: 'image' }]

    expect(extractBlocks(items)).toEqual(items)
  })

  it('returns an empty array when content is undefined', () => {
    expect(extractBlocks(undefined)).toEqual([])
  })
})

describe('getBlockKey', () => {
  const block = (
    componentType: string,
    meta?: { deliveryId?: string; deliveryKey?: string },
  ) =>
    ({ componentType, _meta: meta }) as unknown as Pick<
      AmplienceBlock,
      'componentType' | '_meta'
    >

  it.for([
    {
      reason: 'combines the discriminant, delivery id, and index',
      componentType: 'text',
      meta: { deliveryId: 'abc' },
      index: 2,
      expected: 'text:abc:2',
    },
    {
      reason: 'falls back to the delivery key when no delivery id is present',
      componentType: 'image',
      meta: { deliveryKey: 'en-GB/hero' },
      index: 0,
      expected: 'image:en-GB/hero:0',
    },
    {
      reason:
        'still produces a key for an inline block that carries no metadata',
      componentType: 'divider',
      meta: undefined,
      index: 1,
      expected: 'divider::1',
    },
  ])('$reason', ({ componentType, meta, index, expected }) => {
    expect(getBlockKey(block(componentType, meta), index)).toBe(expected)
  })

  it('keeps keys distinct for sibling blocks sharing one delivery id', () => {
    const meta = { deliveryId: 'shared' }
    const keys = [
      getBlockKey(block('text', meta), 0),
      getBlockKey(block('text', meta), 1),
    ]

    expect(new Set(keys).size).toBe(2)
  })
})
