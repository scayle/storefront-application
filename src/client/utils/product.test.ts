import { describe, expect, it } from 'vitest'
import { createMockDetailedProduct } from '../../test/mock-data/products'
import { getMaxQuantity } from './product'

/** The PDP fixture's variant: 10 in stock. */
const variant = createMockDetailedProduct().variants[0]!

describe('getMaxQuantity', () => {
  it('caps the selectable quantity at 10', () => {
    expect(getMaxQuantity({ ...variant, stock: 11 })).toBe(10)
  })

  it('offers as many units as the variant has in stock below the cap', () => {
    expect(getMaxQuantity({ ...variant, stock: 3 })).toBe(3)
    expect(getMaxQuantity({ ...variant, stock: 0 })).toBe(0)
  })

  it('offers a single unit while no variant is selected yet', () => {
    expect(getMaxQuantity()).toBe(1)
  })
})
