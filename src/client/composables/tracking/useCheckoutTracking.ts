import type { Basket } from '@scayle/storefront/types'
import { usePage } from '@client/composables/usePage'
import { TrackingEventNames } from '@shared/types/Tracking'
import { useBasketEvents } from './useBasketEvents'
import { useTracking } from './useTracking'

/**
 * Web-component events the bridge rebuilds from the web component's own
 * payload: the basket changes made inside the checkout. The checkout steps
 * (`add_shipping_info`, `add_payment_info`) are recognized separately by
 * `toCheckoutStep`, because their items come from the basket. The Storefront
 * Application fires `begin_checkout`, `purchase`, `login` and `sign_up`
 * itself, so a copy from a web component would count twice. Every other event
 * the web components post is dropped.
 */
const FORWARDED_EVENTS: ReadonlySet<unknown> = new Set<string>([
  TrackingEventNames.AddToCart,
  TrackingEventNames.RemoveFromCart,
])

/**
 * GA4 item schema keys of the shop dataLayer contract (`TrackingEcommerceItem`
 * in `@shared/types/Tracking`, documented as the Ecommerce item schema in
 * `docs/GA4-TRACKING.md`). The checkout web component's items carry legacy
 * extras such as `price_with_tax`, `item_brand_id`, `item_category_id` and
 * `item_product_reference_key` that GA4 does not define, so the bridge
 * rebuilds every item down to this schema instead of blocklisting legacy keys
 * one by one — a blocklist cannot cover the keys nobody has observed yet.
 */
const GA4_ITEM_KEYS = [
  'item_id',
  'item_name',
  'price',
  'quantity',
  'index',
  'item_brand',
  'item_variant',
  'item_variant_id',
  'item_category',
  'item_category2',
  'item_category3',
  'item_category4',
  'item_category5',
  'item_list_id',
  'item_list_name',
  'discount',
  'coupon',
  'affiliation',
] as const

/**
 * Keys the web component puts in every `ecommerce` block, the cart events
 * included. Neither is part of the shop dataLayer contract.
 */
const LEGACY_ECOMMERCE_KEYS = ['payment_type', 'shipping_tier'] as const

/**
 * Rebuilds one web-component item down to the GA4 item schema keys, dropping
 * the legacy extras the checkout web component adds (`price_with_tax`,
 * `item_brand_id`, `item_category_id`, `sale`, ...).
 */
const toForwardedItem = (
  item: Record<string, unknown>,
): Record<string, unknown> => {
  const forwardedItem: Record<string, unknown> = {}
  for (const key of GA4_ITEM_KEYS) {
    if (key in item) {
      forwardedItem[key] = item[key]
    }
  }
  // The checkout web component reports the item quantity as a string; GA4
  // expects a number.
  if (typeof forwardedItem.quantity === 'string') {
    forwardedItem.quantity = Number(forwardedItem.quantity)
  }
  return forwardedItem
}

/**
 * Result of aligning the web component's `ecommerce` block with the shop
 * dataLayer contract.
 */
interface ForwardedEcommerce {
  /** The aligned `ecommerce` block. */
  ecommerce: Record<string, unknown>
  /** `currency` to hoist to event level, when the block reports one. */
  currency?: string
  /** `value` to hoist to event level, when the block reports one. */
  value?: number
}

/**
 * Aligns the web component's `ecommerce` block with the shop dataLayer
 * contract: rebuilds every `items` entry down to the GA4 item schema, drops
 * `payment_type` and `shipping_tier`, and hoists `currency` and `value` out of
 * the block for the caller to put at event level.
 */
const toForwardedEcommerce = (
  ecommerce: Record<string, unknown>,
): ForwardedEcommerce => {
  const forwardedEcommerce = { ...ecommerce }

  if (Array.isArray(forwardedEcommerce.items)) {
    forwardedEcommerce.items = (forwardedEcommerce.items as unknown[])
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object',
      )
      .map(toForwardedItem)
  }
  for (const key of LEGACY_ECOMMERCE_KEYS) {
    delete forwardedEcommerce[key]
  }

  // GA4 reads `currency` and `value` at event level on the cart events,
  // while the web component reports both inside its `ecommerce` block.
  let currency: string | undefined
  let value: number | undefined
  if (typeof forwardedEcommerce.currency === 'string') {
    currency = forwardedEcommerce.currency
    delete forwardedEcommerce.currency
  }
  if (typeof forwardedEcommerce.value === 'number') {
    value = forwardedEcommerce.value
    delete forwardedEcommerce.value
  }

  return { ecommerce: forwardedEcommerce, currency, value }
}

/**
 * Aligns a checkout web-component cart event with the shop dataLayer contract.
 *
 * Strips the web component's `page`/`session` objects so the tracking plugin
 * can inject the canonical `context`, rebuilds the `ecommerce` block down to
 * the shop contract (see {@link toForwardedEcommerce}), and fills `currency`
 * from the shop context when the web component omitted it.
 */
const toForwardedPayload = (
  payload: Record<string, unknown>,
  shopCurrency: string,
): Record<string, unknown> => {
  const forwardedPayload = { ...payload }
  delete forwardedPayload.page
  delete forwardedPayload.session

  if (
    forwardedPayload.ecommerce &&
    typeof forwardedPayload.ecommerce === 'object'
  ) {
    const { ecommerce, currency, value } = toForwardedEcommerce(
      forwardedPayload.ecommerce as Record<string, unknown>,
    )
    forwardedPayload.ecommerce = ecommerce
    if (currency !== undefined) {
      forwardedPayload.currency = currency
    }
    if (value !== undefined) {
      forwardedPayload.value = value
    }
  }

  if (typeof forwardedPayload.currency !== 'string') {
    forwardedPayload.currency = shopCurrency
  }

  return forwardedPayload
}

/**
 * Recognizes a checkout step in a web-component tracking payload.
 *
 * The web component posts the completed shipping step as a generic `feature`
 * event named `add_shipping_info` with the `submit` action, and posts
 * `add_payment_info` as an event of its own on every payment method click.
 *
 * @returns The step's event name, the key it is deduplicated on and the one
 *   field GA4 takes from the web component for it (`shipping_tier` or
 *   `payment_type`, empty when not a string), or `undefined` for every other
 *   payload. Items and `value` come from the basket.
 */
const toCheckoutStep = (
  payload: Record<string, unknown>,
):
  | {
      eventName:
        | typeof TrackingEventNames.AddShippingInfo
        | typeof TrackingEventNames.AddPaymentInfo
      dedupeKey: string
      fields: Record<string, string>
    }
  | undefined => {
  if (
    payload.event === 'feature' &&
    payload.name === TrackingEventNames.AddShippingInfo &&
    payload.action === 'submit'
  ) {
    const ecommerce = payload.ecommerce as Record<string, unknown> | undefined
    const shippingTier = ecommerce?.shipping_tier
    return {
      eventName: TrackingEventNames.AddShippingInfo,
      dedupeKey: TrackingEventNames.AddShippingInfo,
      fields:
        typeof shippingTier === 'string' ? { shipping_tier: shippingTier } : {},
    }
  }

  if (payload.event === TrackingEventNames.AddPaymentInfo) {
    const paymentType =
      typeof payload.payment_type === 'string' ? payload.payment_type : ''
    // Keyed on the payment method, because the web component reports every
    // click: a user who clicks PayPal and then pays by card reaches GA4 with
    // both methods instead of the first one only.
    return {
      eventName: TrackingEventNames.AddPaymentInfo,
      dedupeKey: `${TrackingEventNames.AddPaymentInfo}|${paymentType}`,
      fields: paymentType ? { payment_type: paymentType } : {},
    }
  }

  return undefined
}

/**
 * Result of {@link UseCheckoutTrackingReturn.forwardCheckoutTrackingMessage}.
 *
 * `forwarded: false` covers every early-return path (origin mismatch, wrong
 * envelope, missing inner event, an event the bridge does not forward, dedupe
 * hit). `forwarded: true` carries the inner `event` name so callers can branch
 * on it without re-parsing the raw `MessageEvent`.
 */
export type CheckoutTrackingForwardResult =
  { forwarded: false } | { forwarded: true; eventName: string }

interface UseCheckoutTrackingReturn {
  /**
   * Forwards a tracking message dispatched by the SCAYLE Checkout web
   * component onto the shop's `dataLayer` via {@link useTracking}.
   *
   * The web component posts its tracking events through
   * `window.postMessage`. Forwarding them through `useTracking().push` lets
   * each event inherit the shop-side `context` that GTM tags downstream rely
   * on.
   *
   * Behavior:
   * - Returns `{ forwarded: false }` when `event.origin` does not match
   *   `trustedOrigin`.
   * - Returns `{ forwarded: false }` when the message is not a
   *   `{ type: 'tracking' }` envelope or carries no inner `event` payload.
   * - Forwards the completed shipping step as `add_shipping_info` once per
   *   Checkout-page lifetime, and a selected payment method as
   *   `add_payment_info` once per payment method and Checkout-page lifetime,
   *   through `useBasketEvents`. Items, `value` and `coupon` come from
   *   `basket`, because the web component reports item prices without tax and
   *   promotion and `begin_checkout` reports the basket price. Only
   *   `shipping_tier` and `payment_type` come from the web component. Returns
   *   `{ forwarded: false }` for a step while `basket` is `undefined` or
   *   `null` or has no available lines, and forwards the next report of it.
   * - Returns `{ forwarded: false }` for every other event than
   *   `add_to_cart` and `remove_from_cart`. The Storefront Application fires
   *   `begin_checkout`, `purchase`, `login` and `sign_up` itself.
   * - For the cart events, strips the web component's `page`/`session` objects and rebuilds every
   *   `ecommerce.items[]` entry down to the GA4 item schema, dropping the web
   *   component's legacy item fields (`price_with_tax`, `item_brand_id`,
   *   `item_category_id`, ...).
   * - Hoists `currency` and `value` from the web component's `ecommerce` block
   *   to the event level GA4 reads them from, and fills a missing `currency`
   *   from the shop context.
   * - Skips a cart event whose event name and `correlation_id` were already
   *   seen together during this Checkout-page lifetime (dedupe). Cart events
   *   without a `correlation_id` are forwarded every time.
   * - On success returns `{ forwarded: true, eventName }` with the inner
   *   `event` name so the caller can branch (e.g. trigger a basket reload
   *   on `add_to_cart`) without re-parsing the raw `MessageEvent`.
   *
   * @param event Raw `MessageEvent` from the `message` window listener.
   * @param trustedOrigin Origin string the message must match, typically
   *   the shop's `baseUrl` since the web component is iframed under it.
   * @param basket The basket the checkout runs on, as `useBasket` holds it.
   *   Provides items, `value` and `coupon` of the checkout step events.
   * @returns Discriminated result describing whether the event was forwarded
   *   and, if so, the inner event name.
   */
  forwardCheckoutTrackingMessage: (
    event: MessageEvent<unknown>,
    trustedOrigin: string,
    basket: Basket | null | undefined,
  ) => CheckoutTrackingForwardResult
}

/**
 * Bridges tracking events posted by the SCAYLE Checkout web component
 * onto the shop's `dataLayer`.
 *
 * Returns a single function, {@link UseCheckoutTrackingReturn.forwardCheckoutTrackingMessage},
 * intended to be called from `Checkout.vue`'s `useEventListener('message', ...)`
 * handler. The dedupe set is scoped to the composable instance. Inertia
 * recreates the Checkout page component on each visit, so the set is
 * cleared between checkout page visits on their own.
 *
 * @example
 * ```ts
 * const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
 * const { basket } = useBasket()
 * useEventListener('message', (event) => {
 *   const result = forwardCheckoutTrackingMessage(
 *     event,
 *     baseUrl.value,
 *     basket.value,
 *   )
 *   if (result.forwarded && result.eventName === 'add_to_cart') {
 *     await reloadBasket()
 *   }
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useCheckoutTracking(): UseCheckoutTrackingReturn {
  const { push } = useTracking()
  const { trackCheckoutStep } = useBasketEvents()
  const page = usePage()
  // Holds the `event:correlation_id` keys of cart events and the dedupe keys
  // of checkout steps. Only cart event keys contain a `:`.
  const seenKeys = new Set<string>()

  const forwardCheckoutTrackingMessage: UseCheckoutTrackingReturn['forwardCheckoutTrackingMessage'] =
    (event, trustedOrigin, basket) => {
      if (event.origin !== trustedOrigin) {
        return { forwarded: false }
      }

      const data = event.data
      if (!data || typeof data !== 'object') {
        return { forwarded: false }
      }

      if (!('type' in data) || data.type !== 'tracking') {
        return { forwarded: false }
      }

      if (!('event' in data) || !data.event || typeof data.event !== 'object') {
        return { forwarded: false }
      }

      const payload = data.event as Record<string, unknown>

      const step = toCheckoutStep(payload)
      if (step) {
        // The basket is a deferred prop: `undefined` until it resolves, `null`
        // when its fetch failed. Nothing is pushed for a basket without
        // available lines either. In each case the step stays unseen, so the
        // next report of it is forwarded once there is something to report.
        if (!basket || seenKeys.has(step.dedupeKey)) {
          return { forwarded: false }
        }
        if (!trackCheckoutStep(step.eventName, basket, step.fields)) {
          return { forwarded: false }
        }
        seenKeys.add(step.dedupeKey)
        return { forwarded: true, eventName: step.eventName }
      }

      const eventName = payload.event
      if (typeof eventName !== 'string' || !FORWARDED_EVENTS.has(eventName)) {
        return { forwarded: false }
      }

      if (typeof payload.correlation_id === 'string') {
        const correlationKey = `${eventName}:${payload.correlation_id}`
        if (seenKeys.has(correlationKey)) {
          return { forwarded: false }
        }
        seenKeys.add(correlationKey)
      }

      const shopCurrency = page.props.storefront.country.currency.currencyCode

      push(toForwardedPayload(payload, shopCurrency))

      return { forwarded: true, eventName }
    }

  return { forwardCheckoutTrackingMessage }
}
