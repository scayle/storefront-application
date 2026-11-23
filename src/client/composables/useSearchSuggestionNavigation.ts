import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import type {
  SearchCategorySuggestion,
  SearchProductSuggestion,
  SearchNavigationItemSuggestion,
} from '@scayle/storefront/types'
import { wrapIndex } from '@client/utils/math'
import { flattenSearchSuggestions } from '@client/utils/search'
import type { SearchSuggestionEntry } from '@client/utils/search'

/**
 * DOM id for the "show all results" link in the search suggestion list.
 *
 * Used with `aria-activedescendant` to announce the focused suggestion to screen readers.
 */
export const SHOW_ALL_RESULTS_ID = 'search-result-show-all'

/** A dropdown row: a suggestion entry, or the trailing "show all results" link. */
type SearchSuggestionItem = SearchSuggestionEntry | { type: 'showAll' }

interface UseSearchSuggestionNavigationReturn {
  /**
   * The suggestions in dropdown order, without the "show all results" row.
   * The SCAYLE Analytics suggestion events take `position` and `total` from
   * this list; `activeSuggestion` is an element of it, so the two match by
   * identity.
   */
  entries: ComputedRef<SearchSuggestionEntry[]>
  /** The ID of the currently active suggestion for `aria-activedescendant` binding. */
  activeId: ComputedRef<string | undefined>
  /** The link URL of the currently active suggestion (for keyboard Enter support). */
  activeLink: ComputedRef<string | undefined>
  /**
   * The currently active suggestion, so an Enter on it can be reported as its
   * selection. `undefined` when nothing is active or the "show all results"
   * row is, which is not a suggestion.
   */
  activeSuggestion: ComputedRef<SearchSuggestionEntry | undefined>
  /** Move to the next suggestion (cycles at the end). */
  next: () => void
  /** Move to the previous suggestion (cycles at the start). */
  prev: () => void
  /** Reset navigation to no active suggestion. */
  resetNavigation: () => void
}

const getItemId = (entry: SearchSuggestionItem): string => {
  switch (entry.type) {
    case 'category':
      return `search-result-category-${entry.item.id}`
    case 'product':
      return `search-result-product-${entry.item.product.id}`
    case 'navigationItem':
      return `search-result-nav-${entry.item.id}`
    case 'showAll':
      return SHOW_ALL_RESULTS_ID
  }
}

/**
 * Manages accessible keyboard navigation through search suggestions.
 * Flattens grouped suggestions (categories, products, navigation items, "show all")
 * into a single list and tracks the active index for arrow-key cycling.
 * Returns an `activeId` that the search input binds to `aria-activedescendant`,
 * enabling screen readers to announce the currently highlighted suggestion
 * without moving DOM focus away from the input.
 *
 * Creates per-instance state so multiple SFSearchField instances (e.g. desktop
 * and mobile) don't interfere with each other.
 *
 * @param categories - Category suggestions
 * @param products - Product suggestions
 * @param navigationItems - Navigation item suggestions
 * @param showAllResultsLink - Server-generated link for the "show all" entry
 * @returns Navigation controls, `activeId` for props drilling, and the
 * flattened `entries` the tracking calls read
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/discovery/search
 */
export function useSearchSuggestionNavigation(
  categories: ComputedRef<SearchCategorySuggestion[]>,
  products: ComputedRef<SearchProductSuggestion[]>,
  navigationItems: ComputedRef<SearchNavigationItemSuggestion[]>,
  showAllResultsLink: ComputedRef<string>,
): UseSearchSuggestionNavigationReturn {
  const activeIndex = ref(-1)

  const entries = computed(() =>
    flattenSearchSuggestions(
      categories.value,
      products.value,
      navigationItems.value,
    ),
  )

  const flatItems = computed<SearchSuggestionItem[]>(() =>
    entries.value.length > 0 ? [...entries.value, { type: 'showAll' }] : [],
  )

  const activeItem = computed(() => flatItems.value[activeIndex.value])

  const activeSuggestion = computed(() => {
    const item = activeItem.value
    return item && item.type !== 'showAll' ? item : undefined
  })

  const activeId = computed(() => {
    const entry = activeItem.value
    return entry ? getItemId(entry) : undefined
  })

  const activeLink = computed(() => {
    const entry = activeItem.value
    if (!entry) {
      return undefined
    }
    if (entry.type === 'showAll') {
      return showAllResultsLink.value
    }
    return entry.type === 'product' ? entry.item.product.link : entry.item.link
  })

  const next = () => {
    if (!flatItems.value.length) {
      return
    }
    activeIndex.value = wrapIndex(activeIndex.value + 1, flatItems.value.length)
  }

  const prev = () => {
    if (!flatItems.value.length) {
      return
    }
    activeIndex.value =
      activeIndex.value <= 0
        ? flatItems.value.length - 1
        : activeIndex.value - 1
  }

  const resetNavigation = () => {
    activeIndex.value = -1
  }

  return {
    entries,
    activeId,
    activeLink,
    activeSuggestion,
    next,
    prev,
    resetNavigation,
  }
}
