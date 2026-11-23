import type {
  ListingProduct,
  DetailedProduct,
  ProductVariant,
} from '@scayle/storefront/types'
import type {
  AnalyticsApplyFilterEvent,
  AnalyticsViewProductListEvent,
} from '@scayle/storefront-api'
import { TrackingEventNames } from '@shared/types/Tracking'
import {
  mapProductForAnalytics,
  mapProductForTracking,
  mapSurfaceToItemList,
  mapVariantForTracking,
} from '@client/utils/tracking'
import { usePage } from '@client/composables/usePage'
import { useTracking } from '@client/composables/tracking/useTracking'
import { useAnalytics } from '@client/composables/tracking/useAnalytics'

/**
 * Surface a product list was rendered on: the list type and the identifier
 * within it (category id, search term, slider id or promotion id). SCAYLE
 * Analytics reports it as `product_list_type` and `product_list_id`, GA4 as
 * `item_list_name` and `item_list_id`.
 *
 * Grids declare it through a required prop. Sliders report `product_slider`
 * themselves and take an optional `ProductSliderId` from `@shared/types/Tracking`.
 */
export type ProductListSurface = Pick<
  AnalyticsViewProductListEvent,
  'product_list_type' | 'product_list_id'
>

/**
 * Configuration for tracking a product selection from a list: the surface the
 * list was rendered on and the product's position in it.
 */
export interface ProductSelectTrackingOptions extends ProductListSurface {
  /** 1-based product position within the rendered page, sent to GA4. */
  index?: number
  /**
   * Surface GA4 reports instead, for a list GA4 has to tell apart from
   * another list on the same surface.
   */
  itemListSurface?: ProductListSurface
  /**
   * 1-based product position across all pages, sent as the SCAYLE Analytics
   * `position`. Defaults to `index` for unpaginated lists.
   */
  position?: number
  /** Total products in the list across all pages, sent as the SCAYLE Analytics `total`. */
  total?: number
  /**
   * Variant the selected tile had in focus, for tiles that price a variant
   * instead of the product. Reported as the variant fields and as the `price`
   * and `discount` of both events, so the selection matches the tile's
   * impression.
   */
  variant?: ProductVariant
}

/**
 * Surface of a rendered list with its product count.
 */
export interface ProductListTrackingOptions extends ProductListSurface {
  /** Total products in the list across all pages. */
  total: number
}

/**
 * Configuration for tracking a rendered list: its surface, its product count
 * and, for a list GA4 has to tell apart, the surface GA4 reports instead.
 */
export interface ProductListViewTrackingOptions extends ProductListTrackingOptions {
  /**
   * Surface GA4 reports instead, for a list GA4 has to tell apart from
   * another list on the same surface.
   */
  itemListSurface?: ProductListSurface
}

/**
 * Configuration for tracking one visible product tile.
 */
export interface ProductTileTrackingOptions extends ProductListTrackingOptions {
  /** 1-based position of the tile across all pages of the list. */
  position: number
  /**
   * Variant the tile has in focus, for tiles that price a variant instead of
   * the product. Reported as `variant_id` and as the tile's `price` and
   * `discount`.
   */
  variant?: ProductVariant
}

/**
 * Payload for the SCAYLE Analytics `apply_filter` event: one filter value that
 * was added to or removed from a product grid, with the filter state and
 * result count after the change.
 */
export type ApplyFilterTrackingPayload = Omit<
  AnalyticsApplyFilterEvent,
  'event_name'
>

/**
 * Tracks product discovery events.
 *
 * Used by product detail pages, listing grids, search results, wishlist
 * pages, sliders and the gift selection. GA4 and SCAYLE Analytics are two
 * independent calls: `trackViewItem`, `trackSelectItem` and
 * `trackViewItemList` fire both, `trackViewProductTile` and `trackApplyFilter`
 * fire SCAYLE Analytics only. The search events live in `useSearchEvents`.
 *
 * @returns Tracking functions for product detail views, list clicks, list
 * impressions, tile impressions and filter changes.
 *
 * @example
 * ```ts
 * const { trackViewItem, trackSelectItem } = useProductEvents()
 *
 * trackViewItem(product, activeVariant)
 * trackSelectItem(product, {
 *   index: 1,
 *   product_list_type: 'category',
 *   product_list_id: '50342',
 *   total: 96,
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useProductEvents() {
  const { push } = useTracking()
  const { track } = useAnalytics()
  const page = usePage()

  /**
   * Tracks a product detail view: the GA4 `view_item` and the SCAYLE Analytics
   * `view_product_detail`. Call this when the detail page mounts with the
   * active product and variant. Variant-change tracking is handled by
   * separate event flows.
   *
   * @param product Product shown on the detail page.
   * @param variant Optional active variant at mount time.
   */
  const trackViewItem = (
    product: DetailedProduct,
    variant?: ProductVariant,
  ): void => {
    push({
      event: TrackingEventNames.ViewItem,
      ecommerce: {
        items: [
          {
            ...mapProductForTracking(product),
            ...(variant ? mapVariantForTracking(variant) : {}),
          },
        ],
      },
    })

    // The specification marks the main PDP item with an explicit `null`
    // surface, as opposed to a product whose surface is unknown.
    track('view_product_detail', {
      ...mapProductForAnalytics(product, {
        variant,
        campaignId: page.props.campaign?.id,
      }),
      product_list_type: null,
      product_list_id: null,
    })
  }

  /**
   * Tracks a product click from a list context: the GA4 `select_item` and the
   * SCAYLE Analytics `select_product`.
   *
   * @param product Product selected by the user.
   * @param options The surface of the list, the 1-based product index and the
   *   variant the tile priced, when it prices one.
   */
  const trackSelectItem = (
    product: ListingProduct,
    options: ProductSelectTrackingOptions,
  ): void => {
    const itemList = mapSurfaceToItemList(options.itemListSurface ?? options)

    push({
      event: TrackingEventNames.SelectItem,
      ...itemList,
      ecommerce: {
        items: [
          {
            ...mapProductForTracking(product),
            ...(options.variant ? mapVariantForTracking(options.variant) : {}),
            index: options.index,
            ...itemList,
          },
        ],
      },
    })

    track('select_product', {
      ...mapProductForAnalytics(product, {
        variant: options.variant,
        campaignId: page.props.campaign?.id,
      }),
      product_list_type: options.product_list_type,
      product_list_id: options.product_list_id,
      position: options.position ?? options.index,
      total: options.total,
    })
  }

  /**
   * Tracks a rendered list once: the GA4 `view_item_list` with the products
   * on the page and the SCAYLE Analytics `view_product_list` with the list
   * total. The tiles report themselves through `trackViewProductTile`.
   *
   * Call it once when a list with products is shown, not on pagination or
   * filter reloads. An empty list is not reported.
   *
   * @param products Products the list renders, in display order. On a
   *   paginated list, the products of the current page.
   * @param options The surface of the list with the total product count
   *   across all pages, and the surface GA4 reports instead, for a list GA4
   *   has to tell apart.
   */
  const trackViewItemList = (
    products: ListingProduct[],
    options: ProductListViewTrackingOptions,
  ): void => {
    const { itemListSurface, ...surface } = options
    if (!products.length || !surface.total) {
      return
    }

    const itemList = mapSurfaceToItemList(itemListSurface ?? surface)

    push({
      event: TrackingEventNames.ViewItemList,
      ...itemList,
      ecommerce: {
        items: products.map((product, index) => ({
          ...mapProductForTracking(product),
          index: index + 1,
          ...itemList,
        })),
      },
    })

    track('view_product_list', surface)
  }

  /**
   * Tracks the SCAYLE Analytics `view_product_tile` event for one product
   * tile that became visible. GA4 has no per-tile counterpart, and its
   * `view_item_list` fires once per list through `trackViewItemList`.
   *
   * @param product Product shown on the tile.
   * @param options SCAYLE Analytics surface with the tile position across all
   *   pages, the list total and the variant the tile prices.
   */
  const trackViewProductTile = (
    product: ListingProduct,
    options: ProductTileTrackingOptions,
  ): void => {
    const { variant, ...surface } = options
    track('view_product_tile', {
      ...mapProductForAnalytics(product, {
        variant,
        campaignId: page.props.campaign?.id,
      }),
      ...surface,
    })
  }

  /**
   * Tracks the SCAYLE Analytics `apply_filter` event. GA4 has no counterpart.
   *
   * @param payload Filter value, action and the grid state after the change.
   */
  const trackApplyFilter = (payload: ApplyFilterTrackingPayload): void => {
    track('apply_filter', payload)
  }

  return {
    trackViewItem,
    trackSelectItem,
    trackViewItemList,
    trackViewProductTile,
    trackApplyFilter,
  }
}
