import type {
  SearchCategorySuggestion,
  SearchProductSuggestion,
  SearchNavigationItemSuggestion,
} from '@scayle/storefront/types'
import { createMockListingProduct } from './products'

export function createMockCategorySuggestion(
  overrides: Partial<SearchCategorySuggestion> = {},
): SearchCategorySuggestion {
  return {
    id: 1,
    name: 'Test Category',
    link: '/c/test-category-1',
    filters: [],
    breadcrumbs: [],
    ...overrides,
  }
}

export function createMockProductSuggestion(
  overrides: Partial<SearchProductSuggestion> = {},
): SearchProductSuggestion {
  return {
    product: createMockListingProduct(),
    ...overrides,
  }
}

export function createMockNavigationItemSuggestion(
  overrides: Partial<SearchNavigationItemSuggestion> = {},
): SearchNavigationItemSuggestion {
  return {
    id: 1,
    name: 'Test Page',
    link: '/test-page',
    ...overrides,
  }
}
