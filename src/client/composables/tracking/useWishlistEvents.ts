import { computed } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { ListingProduct, DetailedProduct } from '@scayle/storefront/types'
import type { AnalyticsAddToWishlistEvent } from '@scayle/storefront-api'
import { TrackingEventNames } from '@shared/types/Tracking'
import {
  mapProductForAnalytics,
  mapProductForTracking,
  mapSurfaceToItemList,
} from '@client/utils/tracking'
import { useTracking } from './useTracking'
import { useAnalytics } from './useAnalytics'

type WishlistTrackableProduct = DetailedProduct | ListingProduct

/**
 * Surface a product was added to the wishlist from, reported by the SCAYLE
 * Analytics `add_to_wishlist` as `product_list_type` and `product_list_id` and
 * by the GA4 `add_to_wishlist` as the item's `item_list_name` and
 * `item_list_id`.
 *
 * The component rendering the wishlist toggle declares it: a product grid or
 * slider passes its own list type and id, the basket card passes `basket`, and
 * the PDP passes a `null` list type because the closed vocabulary has no
 * product detail surface.
 */
export type WishlistSurface = Pick<
  AnalyticsAddToWishlistEvent,
  'product_list_type' | 'product_list_id'
>

interface UseWishlistEventsReturn {
  /**
   * Tracks an `add_to_wishlist` event and its SCAYLE Analytics counterpart.
   *
   * @param product The product that was added to the wishlist.
   * @param surface Where the product was added from.
   * @param index 1-based position of the product in the surfacing list, if any.
   *   Feeds the GA4 `ecommerce.items[0].index` only, and is left out without one.
   */
  trackAddToWishlist: (
    product: WishlistTrackableProduct,
    surface: WishlistSurface,
    index?: number,
  ) => void
}

/**
 * Tracks wishlist-related GA4 events and their SCAYLE Analytics counterparts.
 *
 * Exposes a single helper for the `add_to_wishlist` lifecycle that fires the
 * GA4 event and the SCAYLE Analytics `add_to_wishlist` in one call. The event is
 * fired after the oRPC mutation confirms success so it reflects server truth
 * rather than optimistic UI state.
 *
 * All helpers are no-ops on the server: the underlying `push` only writes to
 * `window.dataLayer` when running in the browser, and `track` drops the event.
 *
 * @returns Functions for tracking wishlist events.
 *
 * @example
 * ```ts
 * const { trackAddToWishlist } = useWishlistEvents()
 *
 * trackAddToWishlist(product, { product_list_type: 'category', product_list_id: '123' }, 4)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useWishlistEvents(): UseWishlistEventsReturn {
  const { push } = useTracking()
  const { track } = useAnalytics()
  const page = usePage()
  const currency = computed(
    () => page.props.storefront.country.currency.currencyCode,
  )

  const trackAddToWishlist: UseWishlistEventsReturn['trackAddToWishlist'] = (
    product,
    surface,
    index,
  ) => {
    const item = mapProductForTracking(product)

    push({
      event: TrackingEventNames.AddToWishlist,
      currency: currency.value,
      value: item.price ?? 0,
      ecommerce: {
        items: [{ ...item, index, ...mapSurfaceToItemList(surface) }],
      },
    })

    track('add_to_wishlist', {
      ...mapProductForAnalytics(product, {
        campaignId: page.props.campaign?.id,
      }),
      ...surface,
    })
  }

  return { trackAddToWishlist }
}
