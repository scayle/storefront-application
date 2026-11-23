import type { MaybeRefOrGetter } from 'vue'
import { onMounted, toValue, watch } from 'vue'
import type { ListingProduct } from '@scayle/storefront/types'
import type { AnalyticsProductListType } from '@scayle/storefront-api'
import { useRoute } from '@client/composables/useRoute'
import { useProductEvents } from '@client/composables/tracking/useProductEvents'

/**
 * Configuration for product grid tracking.
 *
 * Used by listing grids and the wishlist page to associate list events with
 * the surface the grid renders, its total and its page size.
 */
export interface UseProductListTrackingOptions {
  /** Surface the grid renders: `category`, `search_results` or `wishlist`. */
  productListType: MaybeRefOrGetter<AnalyticsProductListType>
  // The `| undefined` below is not redundant with this property's own `?:` optionality:
  // callers pass a getter, and the getter's return value can itself be undefined (e.g. an
  // unset component prop) independent of whether this option key is supplied at all.
  /** Identifier within the surface: category id or search term. */
  productListId?: MaybeRefOrGetter<string | undefined> // eslint-disable-line sonarjs/no-redundant-optional
  /** Total products across all pages, defaulting to the rendered products for unpaginated lists. */
  total?: MaybeRefOrGetter<number | undefined> // eslint-disable-line sonarjs/no-redundant-optional
  /** Products rendered per page. Omit for unpaginated lists. */
  itemsPerPage?: MaybeRefOrGetter<number | undefined> // eslint-disable-line sonarjs/no-redundant-optional
}

/**
 * Return type of {@link useProductListTracking}.
 *
 * Exposes handlers for product card intersect and select events.
 */
export interface UseProductListTrackingReturn {
  /** Tracks the tile of the card at the zero-based page index once it is on screen. */
  onProductIntersects: (index: number) => void
  /** Tracks a product click from the list. */
  onProductSelect: (product: ListingProduct, index: number) => void
}

/**
 * Tracks a product grid, its tiles and product clicks.
 *
 * Used by `SFProductGrid` and the wishlist page. Fires the GA4
 * `view_item_list` and the SCAYLE Analytics `view_product_list` once per list
 * with products: when the grid first renders products (the wishlist arrives
 * deferred) and whenever the `productListId` changes, which covers category
 * switches that keep the page component alive through a `preserveState`
 * visit. Pagination and filter reloads keep the id, so they stay silent,
 * including a filter that empties the grid and is removed again. An empty
 * list is not reported.
 *
 * The SCAYLE Analytics `view_product_tile` fires once per card, when the card
 * reports that it is on screen (`SFProductCard` waits for half of the card), and
 * a click fires `select_item` and `select_product` through `useProductEvents`.
 * SCAYLE Analytics positions count across all pages, so they pair with the list
 * total. GA4 indexes stay page-relative.
 *
 * @param products Products currently rendered in the grid.
 * @param options Surface of the grid, total and items per page.
 *
 * @returns Handlers for product card intersect and select events.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useProductListTracking(
  products: MaybeRefOrGetter<ListingProduct[]>,
  options: UseProductListTrackingOptions,
): UseProductListTrackingReturn {
  const { trackSelectItem, trackViewItemList, trackViewProductTile } =
    useProductEvents()
  const { query } = useRoute()

  /** Maps a zero-based page index to its zero-based index across all pages. */
  const toListIndex = (index: number): number => {
    const currentPage = Number(query.value.get('page')) || 1
    const perPage = toValue(options.itemsPerPage) ?? toValue(products).length

    return index + (currentPage - 1) * perPage
  }

  const surface = () => ({
    product_list_type: toValue(options.productListType),
    product_list_id: toValue(options.productListId),
    total: toValue(options.total) ?? toValue(products).length,
  })

  onMounted(() => {
    // The id the last list impression reported. The wishlist has no id, so
    // a separate flag tells "nothing reported yet" from "reported `undefined`".
    let hasTracked = false
    let trackedListId: string | undefined
    watch(
      [
        () => toValue(options.productListId),
        () => toValue(products).length > 0,
      ],
      ([productListId, hasProducts]) => {
        if (!hasProducts || (hasTracked && productListId === trackedListId)) {
          return
        }
        hasTracked = true
        trackedListId = productListId
        trackViewItemList(toValue(products), surface())
      },
      { immediate: true },
    )
  })

  const onProductIntersects = (index: number) => {
    const product = toValue(products)[index]
    if (!product) {
      return
    }

    trackViewProductTile(product, {
      ...surface(),
      position: toListIndex(index) + 1,
    })
  }

  const onProductSelect = (product: ListingProduct, index: number) => {
    trackSelectItem(product, {
      index: index + 1,
      position: toListIndex(index) + 1,
      ...surface(),
    })
  }

  return {
    onProductIntersects,
    onProductSelect,
  }
}
