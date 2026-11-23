import { describe, expect, it } from 'vitest'
import { PRODUCT_LISTING_RELOAD_PROPS } from './productListing'

describe('productListing constants', () => {
  // Sorting and filtering spread this list and append their own keys, so a
  // duplicate here would repeat a key in the Inertia `only:` array.
  it('names each prop once', () => {
    expect(new Set(PRODUCT_LISTING_RELOAD_PROPS).size).toBe(
      PRODUCT_LISTING_RELOAD_PROPS.length,
    )
  })
})
