import { computed } from 'vue'
import { usePage } from '@client/composables/usePage'
import type {
  ListingProduct,
  Basket,
  BasketItem,
  DetailedProduct,
  ProductVariant,
} from '@scayle/storefront/types'
import type { AnalyticsEventProduct, CentAmount } from '@scayle/storefront-api'
import { TrackingEventNames } from '@shared/types/Tracking'
import type { TrackingEcommerceItem } from '@shared/types/Tracking'
import {
  mapBasketItemForAnalytics,
  mapBasketItemToTracking,
  mapProductForAnalytics,
  mapProductForTracking,
  mapVariantForTracking,
} from '@client/utils/tracking'
import { toCurrencyUnits } from '@shared/utils/price'
import { useTracking } from './useTracking'
import { useAnalytics } from './useAnalytics'

/**
 * Surface an add happened on, passed by the caller of `trackAddToBasket` for
 * the SCAYLE Analytics `add_to_basket` event.
 *
 * Both fields are `null` for the main PDP item, which is the default. A gift
 * selection reports `gift_selection` with the promotion id. A quantity
 * increase or a size change on the basket page reports `BASKET_SURFACE`.
 * `remove_from_basket` takes no surface from its caller: every removal,
 * decrease and size change happens on the basket page, so
 * `trackRemoveFromBasket` always reports `BASKET_SURFACE`.
 */
export type BasketAddSurface = Pick<
  AnalyticsEventProduct,
  'product_list_type' | 'product_list_id'
>

const PDP_SURFACE: BasketAddSurface = {
  product_list_type: null,
  product_list_id: null,
}

/**
 * Surface of the basket page, where every quantity change and removal
 * happens. The vocabulary has no identifier for the basket itself.
 */
export const BASKET_SURFACE: BasketAddSurface = {
  product_list_type: 'basket',
  product_list_id: null,
}

/**
 * Tracks basket-related GA4 events (`add_to_cart`, `remove_from_cart`,
 * `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`)
 * and their SCAYLE Analytics counterparts
 * (`add_to_basket`, `remove_from_basket`, `view_basket`). Each helper with a
 * counterpart fires both events in one call, so a call site cannot fire one
 * without the other.
 * Events fire only on the client (the underlying `push` and `track` are no-ops
 * on the server).
 *
 * Basket mutations go through oRPC, so callers must await each mutation and
 * only fire granular events on success. `remove_from_cart` in particular must
 * never fire for optimistic UI updates.
 *
 * `useBasket` fires the quantity-change events itself, while the add and
 * remove mutations leave the event to their caller. Every interaction
 * therefore has exactly one call site.
 *
 * @returns Functions for tracking basket events.
 *
 * @example
 * ```ts
 * const { trackAddToBasket, trackViewBasket } = useBasketEvents()
 *
 * // `addItem` resolves with the units the basket gained, or `false`.
 * const added = await addItem({ productName: product.name, variantId, quantity: 2 })
 * if (added) {
 *   trackAddToBasket(variant, product, added)
 * }
 * trackViewBasket(basket)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useBasketEvents() {
  const { push } = useTracking()
  const { track } = useAnalytics()
  const page = usePage()
  const currency = computed(
    () => page.props.storefront.country.currency.currencyCode,
  )

  /**
   * Reads the promotion ids applied to the basket line of a variant.
   *
   * The specification lists `promotion_ids` on `add_to_basket`, but the caller
   * only holds the variant it added. The basket mutations reload the `basket`
   * prop before they resolve, so the line the mutation wrote is available here.
   * Empty when the line is not found.
   *
   * A variant can occupy more than one line: `BasketService.resolveItemGroup`
   * gives a subscription add its own item group, so the plain line and each
   * distinct subscription definition are separate lines, with different
   * promotions on them. The client cannot tell which of them the mutation just
   * wrote, so an ambiguous match reports nothing rather than attributing the
   * wrong line's promotions.
   */
  const getAppliedPromotionIds = (variantId: number): string[] => {
    const basket = page.props.basket
    const [line, ...ambiguous] = [
      ...(basket?.availableItems ?? []),
      ...(basket?.unavailableItems ?? []),
    ].filter((item) => item.variant.id === variantId)

    if (!line || ambiguous.length) {
      return []
    }

    return line.promotions.map((promotion) => promotion.id)
  }

  /**
   * Tracks an `add_to_cart` event and the SCAYLE Analytics `add_to_basket` for
   * the given product and variant.
   *
   * Called after the oRPC `basket.add`, `basket.update` or
   * `basket.changeVariant` mutation resolves successfully. The payload carries
   * the product, variant, and the number of units this interaction added: `1`
   * for an add from the PDP, the difference for a quantity increase on the
   * basket page, the units the new variant gained for a size change.
   *
   * `price` is the catalog price of the variant, since an add from the PDP has
   * no basket line yet. `remove_from_basket` and `view_basket` report the
   * basket unit price of the line, which includes basket-level reductions, so
   * the two directions do not balance to the cent for a promoted line.
   *
   * @param variant The variant that was added.
   * @param product The product (listing or detail shape) that was added.
   * @param quantity The number of units added by this interaction. Defaults to `1`.
   * @param surface Where the product was added from. Defaults to the main PDP
   *   item (`null` surface). A gift selection passes `gift_selection` with the
   *   promotion id.
   */
  const trackAddToBasket = (
    variant: ProductVariant,
    product: DetailedProduct | ListingProduct,
    quantity: number = 1,
    surface: BasketAddSurface = PDP_SURFACE,
  ): void => {
    const item = {
      ...mapProductForTracking(product),
      ...mapVariantForTracking(variant),
      quantity,
    }

    push({
      event: TrackingEventNames.AddToCart,
      currency: currency.value,
      value: (item.price ?? 0) * quantity,
      ecommerce: { items: [item] },
    })

    track('add_to_basket', {
      ...mapProductForAnalytics(product, {
        variant,
        campaignId: page.props.campaign?.id,
      }),
      ...surface,
      quantity,
      promotion_ids: getAppliedPromotionIds(variant.id),
    })
  }

  /**
   * Tracks a `remove_from_cart` event and the SCAYLE Analytics
   * `remove_from_basket` for the given basket item.
   *
   * Must only fire after the oRPC `basket.remove`, `basket.update` or
   * `basket.changeVariant` mutation succeeds, never on optimistic UI updates.
   * The payload carries the full mapped item at the time of removal with the
   * number of units this interaction removed: the whole line on a removal and
   * on a size change, the difference on a quantity decrease. All happen on the
   * basket page, so the event always reports the `basket` surface.
   *
   * @param item The basket item that was removed or decreased.
   * @param quantity The number of units removed by this interaction. Defaults
   *   to the line quantity, a full removal.
   */
  const trackRemoveFromBasket = (
    item: BasketItem,
    quantity: number = item.quantity,
  ): void => {
    const mappedItem = mapBasketItemToTracking(item)

    push({
      event: TrackingEventNames.RemoveFromCart,
      currency: currency.value,
      value: (mappedItem.price ?? 0) * quantity,
      ecommerce: { items: [{ ...mappedItem, quantity }] },
    })

    track('remove_from_basket', {
      ...mapBasketItemForAnalytics(item, {
        campaignId: page.props.campaign?.id,
      }),
      ...BASKET_SURFACE,
      quantity,
    })
  }

  /**
   * Tracks a `view_cart` event and the SCAYLE Analytics `view_basket` for the
   * given basket.
   *
   * Fired once when `Basket.vue` mounts. Includes both available and
   * unavailable items with their list index so downstream analytics can report
   * ordering. The SCAYLE Analytics event carries the basket total and the
   * sale, campaign and promotion reduction sums the basket mapper computes,
   * with every line's quantity and 1-based position.
   *
   * @param basket The basket to track.
   */
  const trackViewBasket = (basket: Basket): void => {
    const allItems = [...basket.availableItems, ...basket.unavailableItems]

    const items: TrackingEcommerceItem[] = allItems.map((item, index) =>
      mapBasketItemToTracking(item, index + 1),
    )

    push({
      event: TrackingEventNames.ViewCart,
      currency: currency.value,
      value: toCurrencyUnits(basket.cost.finalPriceInCents),
      ecommerce: { items },
    })

    track('view_basket', {
      total_price: basket.cost.finalPriceInCents as CentAmount,
      total_sale_discount: basket.cost.saleReductionSumInCents as CentAmount,
      total_campaign_discount: basket.cost
        .campaignReductionSumInCents as CentAmount,
      total_promotions_discount: basket.cost
        .promotionReductionSumInCents as CentAmount,
      products: allItems.map((item, index) =>
        mapBasketItemForAnalytics(item, {
          campaignId: page.props.campaign?.id,
          position: index + 1,
          total: allItems.length,
        }),
      ),
    })
  }

  /**
   * Builds the fields the checkout events share: the available lines with
   * their 1-based position, the basket total and the applied promotion codes.
   * Returns `undefined` for a basket without available lines, since the
   * checkout page renders such a basket as empty.
   */
  const toCheckoutPayload = (basket: Basket) => {
    if (!basket.availableItems.length) {
      return undefined
    }

    const coupon = basket.promotionCodes
      .map((promotion) => promotion.code)
      .filter(Boolean)
      .join(',')

    return {
      currency: currency.value,
      value: toCurrencyUnits(basket.cost.finalPriceInCents),
      ...(coupon && { coupon }),
      ecommerce: {
        items: basket.availableItems.map((item, index) =>
          mapBasketItemToTracking(item, index + 1),
        ),
      },
    }
  }

  /**
   * Tracks a GA4 `begin_checkout` event for the given basket.
   *
   * Fired once by `Checkout.vue` when the checkout page mounts. The checkout
   * web component sends no `begin_checkout` of its own, so the Storefront
   * Application reports it. The payload carries the available lines with their
   * line quantity and 1-based position, since unavailable lines cannot be
   * ordered, and `coupon` with the applied promotion codes, comma-separated,
   * omitted when the basket has none.
   *
   * Pushes nothing for a basket without available lines: the checkout page
   * renders such a basket as empty, so no checkout begins. SCAYLE Analytics has
   * no counterpart event.
   *
   * @param basket The basket the checkout starts with.
   */
  const trackBeginCheckout = (basket: Basket): void => {
    const payload = toCheckoutPayload(basket)
    if (payload) {
      push({ event: TrackingEventNames.BeginCheckout, ...payload })
    }
  }

  /**
   * Tracks a GA4 `add_shipping_info` or `add_payment_info` event for the
   * given basket.
   *
   * Fired by `useCheckoutTracking` when the checkout web component reports a
   * completed shipping step or a selected payment method. The web component
   * reports item prices without tax and promotion, so items, `value` and
   * `coupon` come from the basket instead, built the same way as
   * `begin_checkout` so the funnel reports one price. Pushes nothing for a
   * basket without available lines.
   *
   * @param eventName The checkout step to report.
   * @param basket The basket the checkout runs on.
   * @param fields The fields the web component reports for the step:
   *   `shipping_tier` (such as `DEFAULT`) or `payment_type` (such as
   *   `paypal`). Empty when the web component sent none.
   * @returns `true` when the event was pushed, `false` for a basket without
   *   available lines.
   */
  const trackCheckoutStep = (
    eventName:
      | typeof TrackingEventNames.AddShippingInfo
      | typeof TrackingEventNames.AddPaymentInfo,
    basket: Basket,
    fields: Record<string, string>,
  ): boolean => {
    const payload = toCheckoutPayload(basket)
    if (!payload) {
      return false
    }
    push({ event: eventName, ...payload, ...fields })
    return true
  }

  return {
    trackAddToBasket,
    trackRemoveFromBasket,
    trackViewBasket,
    trackBeginCheckout,
    trackCheckoutStep,
  }
}
