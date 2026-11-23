import { reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createMockBasket } from '@test/mock-data/basket'
import { useCheckoutTracking } from './useCheckoutTracking'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  trackCheckoutStep: vi.fn((..._args: unknown[]) => true),
  page: null as {
    props: { storefront: { country: { currency: { currencyCode: string } } } }
  } | null,
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('./useBasketEvents', () => ({
  useBasketEvents: () => ({
    trackCheckoutStep: mocks.trackCheckoutStep,
  }),
}))

vi.mock('@inertiajs/vue3', () => {
  mocks.page = reactive({
    props: { storefront: { country: { currency: { currencyCode: 'EUR' } } } },
  }) as {
    props: { storefront: { country: { currency: { currencyCode: string } } } }
  }
  return {
    usePage: () => mocks.page,
  }
})

const TRUSTED_ORIGIN = 'https://shop.example.com'

const trackingMessage = (
  payload: Record<string, unknown>,
  origin = TRUSTED_ORIGIN,
): MessageEvent<unknown> =>
  ({
    origin,
    data: { type: 'tracking', event: payload },
  }) as MessageEvent<unknown>

const BASKET = createMockBasket()

/**
 * Item as the checkout web component reports it: `price` without tax and
 * promotion, `quantity` as a string.
 */
const WEB_COMPONENT_ITEM = {
  coupon: '',
  index: 0,
  item_brand: 'studioselect',
  item_id: '403201',
  item_name: 'T-Shirt',
  item_variant: '492980',
  price: 6.36,
  quantity: '1',
}

/**
 * The completed shipping step, as the checkout web component posts it: a
 * generic `feature` event named `add_shipping_info`. Its `payment_type` is the
 * preselected payment method, not a choice the user made.
 */
const SHIPPING_STEP_PAYLOAD = {
  event: 'feature',
  name: 'add_shipping_info',
  action: 'submit',
  label: 'home_delivery|DEFAULT',
  shipping_method: 'DEFAULT|standard_delivery',
  shipping_type: 'carrier',
  ecommerce: {
    coupon: '',
    currency: 'EUR',
    items: [WEB_COMPONENT_ITEM],
    payment_type: 'accounting',
    shipping_tier: 'DEFAULT',
    value: 18.72,
  },
}

/** A selected payment method, as the checkout web component posts it. */
const PAYMENT_STEP_PAYLOAD = {
  event: 'add_payment_info',
  payment_type: 'paypal',
  ecommerce: {
    coupon: '',
    currency: 'EUR',
    items: [WEB_COMPONENT_ITEM],
    payment_type: 'paypal',
    shipping_tier: 'DEFAULT',
    value: 18.72,
  },
}

describe('useCheckoutTracking', () => {
  describe('forwardCheckoutTrackingMessage', () => {
    it('forwards the inner GA4 event payload when origin matches and type is tracking', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      const payload = {
        event: 'remove_from_cart',
        correlation_id: 'abc-1',
        ecommerce: { items: [{ item_id: '205627', quantity: 1 }] },
      }

      const result = forwardCheckoutTrackingMessage(
        trackingMessage(payload),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledTimes(1)
      expect(mocks.push).toHaveBeenCalledWith({
        ...payload,
        currency: 'EUR',
      })
      expect(result).toEqual({
        forwarded: true,
        eventName: 'remove_from_cart',
      })
    })

    // The Storefront Application fires `begin_checkout`, `purchase`, `login`
    // and `sign_up` itself.
    it.for(['begin_checkout', 'purchase', 'login', 'sign_up'])(
      'does not forward %s',
      (eventName) => {
        const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

        const result = forwardCheckoutTrackingMessage(
          trackingMessage({ event: eventName, correlation_id: 'x-1' }),
          TRUSTED_ORIGIN,
          BASKET,
        )

        expect(mocks.push).not.toHaveBeenCalled()
        expect(result).toEqual({ forwarded: false })
      },
    )

    it('forwards the completed shipping step as add_shipping_info with the basket and shipping tier', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      const result = forwardCheckoutTrackingMessage(
        trackingMessage(SHIPPING_STEP_PAYLOAD),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.trackCheckoutStep).toHaveBeenCalledExactlyOnceWith(
        'add_shipping_info',
        BASKET,
        { shipping_tier: 'DEFAULT' },
      )
      expect(mocks.push).not.toHaveBeenCalled()
      expect(result).toEqual({
        forwarded: true,
        eventName: 'add_shipping_info',
      })
    })

    it('forwards add_payment_info with the basket and payment type', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      const result = forwardCheckoutTrackingMessage(
        trackingMessage(PAYMENT_STEP_PAYLOAD),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.trackCheckoutStep).toHaveBeenCalledExactlyOnceWith(
        'add_payment_info',
        BASKET,
        { payment_type: 'paypal' },
      )
      expect(mocks.push).not.toHaveBeenCalled()
      expect(result).toEqual({ forwarded: true, eventName: 'add_payment_info' })
    })

    // The web component posts no `correlation_id` on either step event, and
    // posts `add_payment_info` again on every payment method click.
    it.for([
      ['add_shipping_info', SHIPPING_STEP_PAYLOAD],
      ['add_payment_info', PAYMENT_STEP_PAYLOAD],
    ] as const)('forwards %s once per checkout page visit', ([, payload]) => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage(payload),
        TRUSTED_ORIGIN,
        BASKET,
      )
      const second = forwardCheckoutTrackingMessage(
        trackingMessage(payload),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.trackCheckoutStep).toHaveBeenCalledTimes(1)
      expect(second).toEqual({ forwarded: false })
    })

    it('forwards add_payment_info once per payment method', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      const paymentStep = (paymentType: string) =>
        trackingMessage({ ...PAYMENT_STEP_PAYLOAD, payment_type: paymentType })

      for (const paymentType of ['paypal', 'card', 'paypal']) {
        forwardCheckoutTrackingMessage(
          paymentStep(paymentType),
          TRUSTED_ORIGIN,
          BASKET,
        )
      }

      expect(
        mocks.trackCheckoutStep.mock.calls.map(([, , fields]) => fields),
      ).toEqual([{ payment_type: 'paypal' }, { payment_type: 'card' }])
    })

    it('forwards the next report of a step that pushed nothing', () => {
      mocks.trackCheckoutStep.mockReturnValueOnce(false)
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      const first = forwardCheckoutTrackingMessage(
        trackingMessage(PAYMENT_STEP_PAYLOAD),
        TRUSTED_ORIGIN,
        BASKET,
      )
      const second = forwardCheckoutTrackingMessage(
        trackingMessage(PAYMENT_STEP_PAYLOAD),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(first).toEqual({ forwarded: false })
      expect(second).toEqual({ forwarded: true, eventName: 'add_payment_info' })
      expect(mocks.trackCheckoutStep).toHaveBeenCalledTimes(2)
    })

    it.for([
      ['loading', undefined],
      ['unavailable', null],
    ] as const)(
      'drops a step event while the basket is %s and forwards the next one',
      ([, missingBasket]) => {
        const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

        const first = forwardCheckoutTrackingMessage(
          trackingMessage(PAYMENT_STEP_PAYLOAD),
          TRUSTED_ORIGIN,
          missingBasket,
        )
        forwardCheckoutTrackingMessage(
          trackingMessage(PAYMENT_STEP_PAYLOAD),
          TRUSTED_ORIGIN,
          BASKET,
        )

        expect(first).toEqual({ forwarded: false })
        expect(mocks.trackCheckoutStep).toHaveBeenCalledExactlyOnceWith(
          'add_payment_info',
          BASKET,
          { payment_type: 'paypal' },
        )
      },
    )

    // Feature events the web component posted during one checkout run.
    it.for([
      { name: 'continue_to_payment', action: 'click' },
      { name: 'payment_method', action: 'click' },
      { name: 'add_shipping_info', action: 'click' },
    ])('does not forward the $name $action feature event', (feature) => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      const result = forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'feature', ...feature }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).not.toHaveBeenCalled()
      expect(mocks.trackCheckoutStep).not.toHaveBeenCalled()
      expect(result).toEqual({ forwarded: false })
    })

    it('rebuilds ecommerce items down to the GA4 item schema', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({
          event: 'add_to_cart',
          correlation_id: 'p-3',
          ecommerce: {
            items: [
              {
                item_id: '205627',
                item_name: 'Shirt',
                item_product_reference_key: 'SHIRT-A',
                price: 29.99,
                price_with_tax: 2999,
                item_brand: 'SCAYLE',
                item_brand_id: '42',
                item_category: 'Shirts',
                item_category_id: '9',
                item_variant: 'M',
                item_variant_reference_key: 'SHIRT-A-M',
                sale: true,
                quantity: 2,
                total_quantity: '3',
              },
            ],
          },
        }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'add_to_cart',
        correlation_id: 'p-3',
        currency: 'EUR',
        ecommerce: {
          items: [
            {
              item_id: '205627',
              item_name: 'Shirt',
              price: 29.99,
              item_brand: 'SCAYLE',
              item_category: 'Shirts',
              item_variant: 'M',
              quantity: 2,
            },
          ],
        },
      })
    })

    it('coerces the string item quantity the web component reports to a number', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({
          event: 'add_to_cart',
          correlation_id: 'c-3',
          ecommerce: {
            items: [{ item_id: '205627', quantity: '2' }],
          },
        }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'add_to_cart',
        correlation_id: 'c-3',
        currency: 'EUR',
        ecommerce: { items: [{ item_id: '205627', quantity: 2 }] },
      })
    })

    it('hoists the web component currency and value of a cart event to the event level', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({
          event: 'remove_from_cart',
          correlation_id: 'c-1',
          ecommerce: {
            currency: 'EUR',
            value: 59.98,
            items: [{ item_id: '205627', quantity: 2, price: 29.99 }],
          },
        }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'remove_from_cart',
        correlation_id: 'c-1',
        currency: 'EUR',
        value: 59.98,
        ecommerce: {
          items: [{ item_id: '205627', quantity: 2, price: 29.99 }],
        },
      })
    })

    it('drops the web component payment_type and shipping_tier from the forwarded ecommerce block', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({
          event: 'add_to_cart',
          correlation_id: 'c-2',
          ecommerce: {
            payment_type: 'paypal',
            shipping_tier: 'DHL',
            items: [{ item_id: '205627', quantity: 1 }],
          },
        }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'add_to_cart',
        correlation_id: 'c-2',
        currency: 'EUR',
        ecommerce: { items: [{ item_id: '205627', quantity: 1 }] },
      })
    })

    it('keeps the currency the web component reports over the shop currency', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({
          event: 'add_to_cart',
          correlation_id: 'c-5',
          ecommerce: {
            currency: 'USD',
            items: [{ item_id: '205627', quantity: 1 }],
          },
        }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' }),
      )
    })

    it('fills a missing cart event currency from the shop context', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({
          event: 'add_to_cart',
          correlation_id: 'c-4',
          value: 29.99,
          ecommerce: { items: [{ item_id: '205627', quantity: 1 }] },
        }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'add_to_cart',
        correlation_id: 'c-4',
        currency: 'EUR',
        value: 29.99,
        ecommerce: { items: [{ item_id: '205627', quantity: 1 }] },
      })
    })

    it('strips legacy page/session context from the forwarded payload', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      const payload = {
        event: 'add_to_cart',
        correlation_id: 'p-1',
        page: { interaction_source: 'checkout' },
        session: { customer_id: '123' },
      }

      forwardCheckoutTrackingMessage(
        trackingMessage(payload),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'add_to_cart',
        correlation_id: 'p-1',
        currency: 'EUR',
      })
    })

    it('ignores messages whose origin does not match the trusted origin', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      const result = forwardCheckoutTrackingMessage(
        trackingMessage(
          { event: 'add_to_cart', correlation_id: 'x' },
          'https://evil.example.com',
        ),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).not.toHaveBeenCalled()
      expect(result).toEqual({ forwarded: false })
    })

    it('ignores messages whose type is not tracking', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      const event = {
        origin: TRUSTED_ORIGIN,
        data: { type: 'navigation', event: { event: 'add_to_cart' } },
      } as MessageEvent<unknown>

      const result = forwardCheckoutTrackingMessage(
        event,
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).not.toHaveBeenCalled()
      expect(result).toEqual({ forwarded: false })
    })

    it('ignores messages without an inner event payload', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      const event = {
        origin: TRUSTED_ORIGIN,
        data: { type: 'tracking' },
      } as MessageEvent<unknown>

      const result = forwardCheckoutTrackingMessage(
        event,
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).not.toHaveBeenCalled()
      expect(result).toEqual({ forwarded: false })
    })

    it.for([
      ['null', null],
      ['a string', 'tracking'],
    ] as const)('ignores messages whose data is %s', ([, data]) => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      // Any window can post arbitrary data, so the envelope check has to
      // reject values that are not objects at all.
      const event = { origin: TRUSTED_ORIGIN, data } as MessageEvent<unknown>

      const result = forwardCheckoutTrackingMessage(
        event,
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).not.toHaveBeenCalled()
      expect(result).toEqual({ forwarded: false })
    })

    it('skips a payload whose correlation_id was already seen this session', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()
      const payload = {
        event: 'add_to_cart',
        correlation_id: 'dup-1',
      }

      const first = forwardCheckoutTrackingMessage(
        trackingMessage(payload),
        TRUSTED_ORIGIN,
        BASKET,
      )
      const second = forwardCheckoutTrackingMessage(
        trackingMessage(payload),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledTimes(1)
      expect(first).toEqual({ forwarded: true, eventName: 'add_to_cart' })
      expect(second).toEqual({ forwarded: false })
    })

    it('forwards distinct correlation_id values separately', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'add_to_cart', correlation_id: 'a' }),
        TRUSTED_ORIGIN,
        BASKET,
      )
      forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'add_to_cart', correlation_id: 'b' }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledTimes(2)
    })

    it('forwards events with different names that share a correlation_id', () => {
      const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

      forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'add_to_cart', correlation_id: 'same' }),
        TRUSTED_ORIGIN,
        BASKET,
      )
      forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'remove_from_cart', correlation_id: 'same' }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledTimes(2)
    })

    it('keeps dedupe state per composable instance', () => {
      const first = useCheckoutTracking()
      first.forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'add_to_cart', correlation_id: 'shared' }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      const second = useCheckoutTracking()
      second.forwardCheckoutTrackingMessage(
        trackingMessage({ event: 'add_to_cart', correlation_id: 'shared' }),
        TRUSTED_ORIGIN,
        BASKET,
      )

      expect(mocks.push).toHaveBeenCalledTimes(2)
    })
  })
})
