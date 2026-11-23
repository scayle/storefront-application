import { describe, expect, it } from 'vitest'
import {
  getProductImageLoading,
  PRODUCT_IMAGE_EAGER_LOADING_COUNT,
} from './index'

describe('getProductImageLoading', () => {
  it('loads the first PRODUCT_IMAGE_EAGER_LOADING_COUNT images eagerly', () => {
    for (let index = 0; index < PRODUCT_IMAGE_EAGER_LOADING_COUNT; index++) {
      expect(getProductImageLoading(index)).toBe('eager')
    }
  })

  it('loads images at or beyond the threshold lazily', () => {
    expect(getProductImageLoading(PRODUCT_IMAGE_EAGER_LOADING_COUNT)).toBe(
      'lazy',
    )
    expect(getProductImageLoading(PRODUCT_IMAGE_EAGER_LOADING_COUNT + 10)).toBe(
      'lazy',
    )
  })
})
