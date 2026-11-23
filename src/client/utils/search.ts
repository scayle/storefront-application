import type {
  SearchCategorySuggestion,
  SearchNavigationItemSuggestion,
  SearchProductSuggestion,
} from '@scayle/storefront/types'

/**
 * A suggestion the dropdown renders: a category, product or navigation item
 * match. The "show all results" link is not a suggestion.
 */
export type SearchSuggestion =
  | SearchCategorySuggestion
  | SearchProductSuggestion
  | SearchNavigationItemSuggestion

/**
 * One row of the search suggestion dropdown, tagged with the group it came
 * from. The "show all results" link is not a suggestion and is not part of
 * this union.
 */
export type SearchSuggestionEntry =
  | { type: 'category'; item: SearchCategorySuggestion }
  | { type: 'product'; item: SearchProductSuggestion }
  | { type: 'navigationItem'; item: SearchNavigationItemSuggestion }

/**
 * Flattens grouped search suggestions into the order the dropdown renders
 * them: categories, then products, then navigation items.
 *
 * Keyboard navigation and the SCAYLE Analytics suggestion events both read
 * this list, so a suggestion's `position` matches what the user sees.
 *
 * @param categories Category suggestions
 * @param products Product suggestions
 * @param navigationItems Navigation item suggestions
 * @returns Tagged entries in dropdown order, empty when there are no suggestions
 */
export function flattenSearchSuggestions(
  categories: SearchCategorySuggestion[],
  products: SearchProductSuggestion[],
  navigationItems: SearchNavigationItemSuggestion[],
): SearchSuggestionEntry[] {
  return [
    ...categories.map((item): SearchSuggestionEntry => ({
      type: 'category',
      item,
    })),
    ...products.map((item): SearchSuggestionEntry => ({
      type: 'product',
      item,
    })),
    ...navigationItems.map((item): SearchSuggestionEntry => ({
      type: 'navigationItem',
      item,
    })),
  ]
}
