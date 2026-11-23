import { toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ListingProduct } from '@scayle/storefront/types'
import { useProductEvents } from '@client/composables/tracking/useProductEvents'
import type {
  ProductSliderId,
  TrackingItemListId,
} from '@shared/types/Tracking'

interface UseProductSliderTrackingOptions {
  /**
   * Slider id sent as the SCAYLE Analytics `product_list_id` and the GA4
   * `item_list_id`. Omitted for sliders the tracking specification has no id
   * for, such as CMS product sliders.
   */
  productListId?: ProductSliderId
  /**
   * GA4 `item_list_id` that replaces `productListId` on the GA4 events, for a
   * list GA4 has to tell apart from another slider with the same id.
   */
  itemListId?: TrackingItemListId
  /**
   * Turns `true` once the surface scrolls into view, which is what reports the
   * list-level impression. Pass a `useElementVisibility(…, { once: true })`.
   */
  isVisible: Ref<boolean>
}

interface UseProductSliderTrackingReturn {
  /** Reports one tile impression. Pass the card's zero-based index. */
  onProductIntersects: (product: ListingProduct, index: number) => void
  /** Reports a tile click. Pass the card's zero-based index. */
  onProductSelect: (product: ListingProduct, index: number) => void
}

/**
 * Reports a set of products laid out as a `product_slider` surface: the
 * list-level GA4 `view_item_list` and SCAYLE `view_product_list` once the
 * surface becomes visible, plus per-tile impressions and selects.
 *
 * Used by every surface that tracks as `product_slider`, so the horizontal
 * slider and the add-to-basket panel's desktop grid report identically instead
 * of keeping two copies of the same payload shape.
 *
 * @param products - The products the surface renders, in display order.
 * @param options - The list identity and the visibility source.
 * @param options.productListId - Slider id, omitted for lists the
 *   specification has no id for.
 * @param options.itemListId - GA4 id that replaces the slider id on the GA4
 *   events, omitted where GA4 reports the slider id.
 * @param options.isVisible - Turns `true` once the surface scrolls into view.
 * @returns The two per-tile handlers to bind on each card.
 *
 * @example
 * ```ts
 * const isVisible = useElementVisibility(sliderRef, { once: true })
 * const { onProductIntersects, onProductSelect } = useProductSliderTracking(
 *   () => products,
 *   { productListId: ProductSliderIds.Trending, isVisible },
 * )
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useProductSliderTracking(
  products: MaybeRefOrGetter<ListingProduct[]>,
  { productListId, itemListId, isVisible }: UseProductSliderTrackingOptions,
): UseProductSliderTrackingReturn {
  const { trackSelectItem, trackViewItemList, trackViewProductTile } =
    useProductEvents()

  /** Surface of the list, reported by both pipelines. */
  const listSurface = () => ({
    product_list_type: 'product_slider' as const,
    product_list_id: productListId,
    total: toValue(products).length,
  })

  /** Surface GA4 reports instead, where it has to tell the slider apart. */
  const itemListSurface = itemListId
    ? {
        product_list_type: 'product_slider' as const,
        product_list_id: itemListId,
      }
    : undefined

  // The container becoming visible is the list impression of both
  // pipelines; each card reports its own SCAYLE Analytics tile once it
  // scrolls into view, so off-screen products do not count as tile
  // impressions.
  watch(isVisible, (visible) => {
    if (!visible) {
      return
    }

    trackViewItemList(toValue(products), { ...listSurface(), itemListSurface })
  })

  const onProductIntersects = (product: ListingProduct, index: number) => {
    trackViewProductTile(product, { ...listSurface(), position: index + 1 })
  }

  const onProductSelect = (product: ListingProduct, index: number) => {
    trackSelectItem(product, {
      index: index + 1,
      ...listSurface(),
      itemListSurface,
    })
  }

  return { onProductIntersects, onProductSelect }
}
