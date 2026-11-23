import { until, useSessionStorage } from '@vueuse/core'
import type { Order, OrderItem } from '@scayle/storefront/types'
import type { TrackingEcommerceItem } from '@shared/types/Tracking'
import { TrackingEventNames } from '@shared/types/Tracking'
import { toCurrencyUnits } from '@shared/utils/price'
import { useConsent } from '@client/composables/useConsent'
import { useConsentManager } from '@client/composables/useConsentManager'
import { useTracking } from './useTracking'

/**
 * Maps one order line to a GA4 purchase item.
 *
 * The Checkout order line has no category trail, so `item_category` is left
 * out. `discount` is the consolidated per-unit reduction, and a line with no
 * reduction omits it.
 */
const mapOrderItemToTracking = (
  item: OrderItem,
  index: number,
): TrackingEcommerceItem => {
  const discountInCents =
    item.price.originalPriceInCents - item.price.finalPriceInCents
  const discount = toCurrencyUnits(
    discountInCents > 0 ? discountInCents : undefined,
  )

  return {
    item_id: item.product.id.toString(),
    item_name: item.product.name,
    price: toCurrencyUnits(item.price.finalPriceInCents),
    quantity: item.quantity,
    index,
    item_brand: item.product.brand || undefined,
    item_variant: item.variant.size || undefined,
    ...(discount !== undefined && { discount }),
  }
}

// On a full page load the consent management platform reports a few
// milliseconds after the page mounts, and consent reads `false` until then. The
// limit keeps a platform that never reports, for example a blocked loader, from
// swallowing the purchase.
const CMP_REPORT_TIMEOUT_MS = 5000

interface UseOrderEventsReturn {
  /**
   * Tracks a GA4 `purchase` for a confirmed order, once per order and tab.
   *
   * Called from the order success page after the order has loaded. The page is
   * a plain GET, so a reload, a revisit or a back navigation mounts it again
   * for the same order. First waits for the consent management platform's
   * first report, for up to 5 seconds, because consent reads `false` until it
   * arrives. With `google-analytics` consent the order id is then remembered in
   * session storage, and later calls for that order in the same tab push
   * nothing. Another tab or a cleared storage sends the event again. The order
   * counts as sent when the event is pushed, so an event still held back by the
   * tracking plugin is not retried. Without consent nothing is stored and every
   * call pushes.
   *
   * The Checkout order payload has no promotion code, so the event omits
   * `coupon`. An order with several deliveries reports the first delivery's
   * carrier and the first delivery fee's option, because the event has one of
   * each. `payment_method`, `carrier` and `delivery_option` are omitted when
   * the order has none.
   *
   * @param order The confirmed order.
   * @returns A promise that resolves once the event is pushed or skipped as a duplicate.
   */
  trackPurchase: (order: Order) => Promise<void>
}

/**
 * Tracks the order success `purchase` event.
 *
 * `purchase` stays in the Storefront, so this is its only source. The checkout
 * bridge does not forward the web component's `purchase`.
 *
 * @returns The purchase tracker.
 *
 * @example
 * ```ts
 * const { trackPurchase } = useOrderEvents()
 *
 * onMounted(() => {
 *   if (order) {
 *     void trackPurchase(order)
 *   }
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useOrderEvents(): UseOrderEventsReturn {
  const { push } = useTracking()
  const { consent } = useConsent('google-analytics')
  const { cmpPending } = useConsentManager()

  const trackPurchase = async (order: Order): Promise<void> => {
    await until(cmpPending).toBe(false, {
      timeout: CMP_REPORT_TIMEOUT_MS,
      throwOnTimeout: false,
    })

    const transactionId = order.id.toString()
    // Session storage is device storage, so it is only read or written with
    // consent. The ref is created here and not at setup, because creating it
    // already reads the key.
    const trackedOrderIds = consent.value
      ? useSessionStorage<string[]>('trackedPurchaseOrderIds', [], {
          flush: 'sync',
        })
      : undefined
    if (trackedOrderIds?.value.includes(transactionId)) {
      return
    }

    const items = order.deliveries.flatMap((delivery) => delivery.items)
    const paymentMethod = order.payment[0]?.key
    const carrier = order.deliveries[0]?.carrierKey

    push({
      event: TrackingEventNames.Purchase,
      total_sale_discount: toCurrencyUnits(order.cost.saleReductionSumInCents),
      total_campaign_discount: toCurrencyUnits(
        order.cost.campaignReductionSumInCents,
      ),
      total_promotions_discount: toCurrencyUnits(
        order.cost.promotionReductionSumInCents,
      ),
      ...(paymentMethod && { payment_method: paymentMethod }),
      ...(carrier && { carrier }),
      ...(order.cost.deliveryOption && {
        delivery_option: order.cost.deliveryOption,
      }),
      ecommerce: {
        transaction_id: transactionId,
        currency: order.cost.currency,
        value: toCurrencyUnits(order.cost.finalPriceInCents),
        tax: toCurrencyUnits(order.cost.taxInCents),
        shipping: toCurrencyUnits(order.cost.shippingCostInCents),
        items: items.map((item, index) =>
          mapOrderItemToTracking(item, index + 1),
        ),
      },
    })
    if (trackedOrderIds) {
      trackedOrderIds.value = [...trackedOrderIds.value, transactionId]
    }
  }

  return { trackPurchase }
}
