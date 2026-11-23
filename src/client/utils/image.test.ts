import { describe, expect, it } from 'vitest'
import type { ProductImage } from '@scayle/storefront/types'
import { orderImagesByImageType } from './image'

const image = (name: string, imageType?: string): ProductImage => ({
  url: `https://cdn.example.com/${name}.avif`,
  name: `${name}.jpg`,
  applyPadding: false,
  imageType,
})

const front = image('front')
const typeA1 = image('type-a-1', 'type-a')
const back = image('back')
const typeA2 = image('type-a-2', 'type-a')
const typeB = image('type-b', 'type-b')

describe('orderImagesByImageType', () => {
  it.for([
    {
      when: 'images of the selected type are spread out',
      images: [front, typeA1, back, typeA2],
      expected: [typeA1, typeA2, front, back],
    },
    {
      when: 'another type sits between them',
      images: [typeB, typeA1, front, typeA2],
      expected: [typeA1, typeA2, typeB, front],
    },
    {
      when: 'the product has no image of the selected type',
      images: [front, back, typeB],
      expected: [front, back, typeB],
    },
    { when: 'the product has no images', images: [], expected: [] },
  ])(
    'moves the selected type to the front in Panel order when $when',
    ({ images, expected }) => {
      expect(orderImagesByImageType(images, 'type-a')).toEqual(expected)
    },
  )

  it('returns the Panel order unchanged for the default view', () => {
    const images = [front, typeA1, back]
    expect(orderImagesByImageType(images, undefined)).toBe(images)
  })
})
