import { describe, expect, it } from 'vitest'
import {
  createMockCategorySuggestion,
  createMockNavigationItemSuggestion,
  createMockProductSuggestion,
} from '@test/mock-data/search'
import { flattenSearchSuggestions } from './search'

describe('flattenSearchSuggestions', () => {
  it('lists categories, then products, then navigation items', () => {
    const category = createMockCategorySuggestion({ id: 1 })
    const product = createMockProductSuggestion()
    const navigationItem = createMockNavigationItemSuggestion({ id: 3 })

    expect(
      flattenSearchSuggestions([category], [product], [navigationItem]),
    ).toEqual([
      { type: 'category', item: category },
      { type: 'product', item: product },
      { type: 'navigationItem', item: navigationItem },
    ])
  })

  it('returns an empty list without suggestions', () => {
    expect(flattenSearchSuggestions([], [], [])).toEqual([])
  })
})
