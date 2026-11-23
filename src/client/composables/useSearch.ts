import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type {
  SearchResolveResult,
  GroupedSearchSuggestions,
} from '@scayle/storefront/types'
import { buildSearchRoute } from '@shared/routes'
import { useRpcClient } from './useRpcClient'

/** Default empty suggestions used as initial state and after reset. */
const emptySuggestions: GroupedSearchSuggestions = {
  categories: [],
  products: [],
  navigationItems: [],
  showAllResultsLink: '',
}

/** Return type of the useSearch composable. */
interface UseSearchReturn {
  /** Current search input value, bound to the search field */
  searchQuery: Ref<string>
  /** Request lifecycle status: idle before any search, pending during fetch, success/error after */
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
  /** Full grouped suggestions object */
  suggestions: Ref<GroupedSearchSuggestions>
  /** Product suggestions shortcut */
  products: ComputedRef<GroupedSearchSuggestions['products']>
  /** Category suggestions shortcut */
  categories: ComputedRef<GroupedSearchSuggestions['categories']>
  /** Navigation item suggestions shortcut */
  navigationItems: ComputedRef<GroupedSearchSuggestions['navigationItems']>
  /** Server-generated link to the search results page for the current term */
  showAllResultsLink: ComputedRef<string>
  /** True when at least one suggestion exists in any group */
  hasSuggestions: ComputedRef<boolean>
  /** Fetches suggestions for the current searchQuery via oRPC */
  getSearchSuggestions: () => Promise<void>
  /** Resolves the current searchQuery to a redirect target */
  resolveSearch: () => Promise<SearchResolveResult | null>
  /** Clears the search query, suggestions, and resets status to idle */
  resetSearch: () => void
}

/**
 * Manages search state, suggestions fetching, and search resolution.
 * Handles race conditions via AbortController and stale-term comparison
 * to ensure suggestions always match the current input.
 *
 * Each call creates independent local state. However, the internal AbortController
 * is shared via closure — if two instances call getSearchSuggestions concurrently,
 * one may abort the other's in-flight request. This is not an issue when only one
 * instance is active at a time (e.g. desktop/mobile with CSS visibility toggling).
 *
 * @returns Reactive search state with methods to fetch suggestions, resolve, and reset
 *
 * @example
 * ```ts
 * const { searchQuery, getSearchSuggestions, products, resolveSearch } = useSearch()
 *
 * // Bind searchQuery to input, call getSearchSuggestions on input change
 * watch(searchQuery, () => getSearchSuggestions())
 *
 * // Resolve on Enter press
 * const result = await resolveSearch()
 * if (result) navigateTo(result.link)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/discovery/search
 */
export function useSearch(): UseSearchReturn {
  const rpcClient = useRpcClient()

  const searchQuery = ref('')
  const suggestions = ref<GroupedSearchSuggestions>({ ...emptySuggestions })
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

  const products = computed(() => suggestions.value.products)
  const categories = computed(() => suggestions.value.categories)
  const navigationItems = computed(() => suggestions.value.navigationItems)
  const showAllResultsLink = computed(
    () =>
      suggestions.value.showAllResultsLink ||
      buildSearchRoute(searchQuery.value),
  )

  const hasSuggestions = computed(
    () =>
      products.value.length > 0 ||
      categories.value.length > 0 ||
      navigationItems.value.length > 0,
  )

  let suggestionsAbortController: AbortController | null = null

  const getSearchSuggestions = async () => {
    suggestionsAbortController?.abort()

    if (!searchQuery.value) {
      suggestions.value = { ...emptySuggestions }
      status.value = 'idle'
      return
    }

    const requestedTerm = searchQuery.value
    const controller = new AbortController()
    suggestionsAbortController = controller
    status.value = 'pending'

    const { error, data } = await rpcClient.search.getSuggestions(
      { term: requestedTerm },
      { signal: controller.signal },
    )

    if (requestedTerm !== searchQuery.value) {
      return
    }

    if (error) {
      if (controller.signal.aborted) {
        return
      }
      status.value = 'error'
      return
    }

    suggestions.value = data
    status.value = 'success'
  }

  const resolveSearch = async (): Promise<SearchResolveResult | null> => {
    if (!searchQuery.value) {
      return null
    }

    const { error, data } = await rpcClient.search.resolve({
      term: searchQuery.value,
    })

    if (error) {
      return null
    }

    return data.result
  }

  const resetSearch = () => {
    searchQuery.value = ''
    suggestions.value = { ...emptySuggestions }
    status.value = 'idle'
  }

  return {
    searchQuery,
    status,
    suggestions,
    products,
    categories,
    navigationItems,
    showAllResultsLink,
    hasSuggestions,
    getSearchSuggestions,
    resolveSearch,
    resetSearch,
  }
}
