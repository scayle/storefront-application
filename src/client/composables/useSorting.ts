import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { SortOption } from '@scayle/storefront/types'
import { PRODUCT_LISTING_RELOAD_PROPS } from '@shared/constants/productListing'
import { useRoute } from './useRoute'

/** Return shape of `useSorting`. */
export interface UseSortingReturn {
  /**
   * Navigates to the current URL with the given `sort` parameter and without
   * `page`, so the new order starts on page 1, and reloads only the listing
   * props and `sorting`. Does nothing when the key is already selected.
   *
   * @param key Key of the sort option to apply.
   */
  applySort: (key: string) => void
}

/**
 * Applies a sort option on the Product Listing Page.
 *
 * Shared by the desktop sort dropdown (`SFSortSelection`) and the mobile sort
 * chips (`SFMobileSortSelection`), so both send the same query and reload the
 * same props.
 *
 * @param selectedSort The selected sort option. Pass a getter or a ref: a
 *   plain value is read once, so a later change of the prop would not reach
 *   the comparison.
 * @returns `applySort`, the function that applies a sort option.
 *
 * @example
 * ```ts
 * const { selectedSort } = defineProps<{ selectedSort?: SortOption }>()
 * const { applySort } = useSorting(() => selectedSort)
 * // <button @click="applySort('price_asc')">...</button>
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
 */
export function useSorting(
  selectedSort: MaybeRefOrGetter<SortOption | undefined>,
): UseSortingReturn {
  const { path, query, navigate } = useRoute()

  const applySort = (key: string) => {
    if (key === toValue(selectedSort)?.key) {
      return
    }

    const nextQuery = new URLSearchParams(query.value)
    nextQuery.set('sort', key)
    nextQuery.delete('page')

    const newPath = `${path.value}?${nextQuery}`

    navigate(newPath, {
      only: [...PRODUCT_LISTING_RELOAD_PROPS, 'sorting'],
      preserveState: true,
    })
  }

  return { applySort }
}
