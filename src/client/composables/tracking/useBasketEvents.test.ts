import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  Basket,
  BasketCost,
  BasketItem,
  Campaign,
} from '@scayle/storefront/types'
import { createMockBasket, createMockBasketItem } from '@test/mock-data/basket'
import {
  createMockListingProduct,
  createMockProductVariant,
  createMockVariantPrice,
} from '@test/mock-data/products'
import {
  createMockCampaign,
  createMockPromotion,
} from '@test/mock-data/promotions'
import { useBasketEvents } from './useBasketEvents'

interface PageMock {
  props: {
    storefront: { country: { currency: { currencyCode: string } } }
    basket?: Basket
    campaign?: Campaign | null
  }
}

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  track: vi.fn(),
  page: null as PageMock | null,
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('./useAnalytics', () => ({
  useAnalytics: () => ({ track: mocks.track }),
}))

vi.mock('@inertiajs/vue3', () => {
  mocks.page = reactive({
    props: { storefront: { country: { currency: { currencyCode: 'EUR' } } } },
  }) as PageMock
  return {
    usePage: () => mocks.page,
  }
})

/**
 * Builds one unit of variant 10 (size 42) of product 1 at €29.99, the line the
 * tests track. Basket events read `unitPrice`, never `totalPrice`.
 */
function createItem(overrides: Partial<BasketItem> = {}): BasketItem {
  const price = () =>
    createMockVariantPrice({
      finalPrice: '29,99 €',
      originalPrice: '29,99 €',
      finalPriceInCents: 2999,
      originalPriceInCents: 2999,
    })
  return createMockBasketItem({
    quantity: 1,
    unitPrice: price(),
    product: createMockListingProduct({ id: 1 }),
    variant: createMockProductVariant({ id: 10, label: '42', price: price() }),
    ...overrides,
  })
}

function createBasket(
  items: BasketItem[],
  cost: Partial<BasketCost> = {},
): Basket {
  const basket = createMockBasket({
    availableItems: items.filter((item) => item.status === 'available'),
    unavailableItems: items.filter((item) => item.status !== 'available'),
  })
  return { ...basket, cost: { ...basket.cost, ...cost } }
}

describe('useBasketEvents', () => {
  beforeEach(() => {
    if (mocks.page) {
      mocks.page.props.storefront = {
        country: { currency: { currencyCode: 'EUR' } },
      }
      mocks.page.props.basket = undefined
      mocks.page.props.campaign = null
    }
  })

  describe('trackAddToBasket', () => {
    it('pushes add_to_cart with currency, value, and an ecommerce item', () => {
      const item = createItem()
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product, 2)

      expect(mocks.push).toHaveBeenCalledTimes(1)
      const event = mocks.push.mock.calls[0]?.[0]
      expect(event).toMatchObject({
        event: 'add_to_cart',
        currency: 'EUR',
        value: 59.98,
        ecommerce: {
          items: [
            {
              item_id: '1',
              item_variant: '42',
              item_variant_id: '10',
              quantity: 2,
              price: 29.99,
            },
          ],
        },
      })
    })

    it('tracks the SCAYLE add_to_basket with the delta on the null PDP surface', () => {
      const item = createItem()
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product, 2)

      expect(mocks.track).toHaveBeenCalledTimes(1)
      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({
          quantity: 2,
          product_list_type: null,
          product_list_id: null,
        }),
      )
    })

    it('reports the active campaign on add_to_basket for a campaign-priced variant', () => {
      mocks.page!.props.campaign = createMockCampaign({ id: '31' })
      const item = createItem()
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(
        {
          ...item.variant,
          price: { ...item.variant.price, hasCampaignReduction: true },
        },
        item.product,
        1,
      )

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({ campaign_id: '31' }),
      )
    })

    it('reports the gift selection surface the caller passes', () => {
      const item = createItem()
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product, 1, {
        product_list_type: 'gift_selection',
        product_list_id: 'promo-1',
      })

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({
          product_list_type: 'gift_selection',
          product_list_id: 'promo-1',
          quantity: 1,
        }),
      )
    })

    it('reads the promotion ids from the reloaded basket line of the variant', () => {
      const item = createItem({
        promotions: [
          createMockPromotion({ id: 'promo-a' }),
          createMockPromotion({ id: 'promo-b' }),
        ],
      })
      mocks.page!.props.basket = createBasket([
        createItem({ key: 'other', variant: { ...item.variant, id: 99 } }),
        item,
      ])
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product, 1)

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({ promotion_ids: ['promo-a', 'promo-b'] }),
      )
    })

    it('reads the promotion ids from an unavailable basket line too', () => {
      const item = createItem({
        status: 'unavailable',
        promotions: [createMockPromotion({ id: 'promo-a' })],
      })
      mocks.page!.props.basket = createBasket([item])
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product, 1)

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({ promotion_ids: ['promo-a'] }),
      )
    })

    it('reports no promotion ids when the variant sits on more than one line', () => {
      // A subscription add resolves its own item group, so the plain line and
      // the subscription line of the same variant coexist with different
      // promotions. Neither may be attributed to the other.
      const item = createItem({
        promotions: [createMockPromotion({ id: 'promo-a' })],
      })
      mocks.page!.props.basket = createBasket([
        item,
        createItem({
          key: 'subscription',
          promotions: [createMockPromotion({ id: 'promo-subscription' })],
        }),
      ])
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product, 1)

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({ promotion_ids: [] }),
      )
    })

    it('defaults the added quantity to one', () => {
      const item = createItem()
      const { trackAddToBasket } = useBasketEvents()

      trackAddToBasket(item.variant, item.product)

      expect(mocks.push).toHaveBeenCalledWith(
        expect.objectContaining({
          ecommerce: { items: [expect.objectContaining({ quantity: 1 })] },
        }),
      )
      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_basket',
        expect.objectContaining({ quantity: 1 }),
      )
    })
  })

  describe('trackRemoveFromBasket', () => {
    it('pushes remove_from_cart for the basket item with currency and value', () => {
      const item = createItem()
      const { trackRemoveFromBasket } = useBasketEvents()

      trackRemoveFromBasket(item)

      expect(mocks.push).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'remove_from_cart',
          currency: 'EUR',
          value: 29.99,
          ecommerce: {
            items: [
              expect.objectContaining({
                item_id: '1',
                item_variant: '42',
                item_variant_id: '10',
                quantity: 1,
              }),
            ],
          },
        }),
      )
    })

    it('tracks the whole line quantity on the basket surface by default', () => {
      const item = createItem({
        quantity: 3,
        promotions: [createMockPromotion({ id: 'promo-a' })],
      })
      const { trackRemoveFromBasket } = useBasketEvents()

      trackRemoveFromBasket(item)

      expect(mocks.track).toHaveBeenCalledTimes(1)
      expect(mocks.track).toHaveBeenCalledWith(
        'remove_from_basket',
        expect.objectContaining({
          quantity: 3,
          promotion_ids: ['promo-a'],
          product_list_type: 'basket',
          product_list_id: null,
        }),
      )
    })

    it('reports the active campaign on remove_from_basket for a campaign-priced line', () => {
      mocks.page!.props.campaign = createMockCampaign({ id: '31' })
      const item = createItem()
      item.unitPrice.hasCampaignReduction = true
      const { trackRemoveFromBasket } = useBasketEvents()

      trackRemoveFromBasket(item)

      expect(mocks.track).toHaveBeenCalledWith(
        'remove_from_basket',
        expect.objectContaining({ campaign_id: '31' }),
      )
    })

    it('reports the units removed by a quantity decrease on both pipelines', () => {
      const item = createItem({ quantity: 5 })
      const { trackRemoveFromBasket } = useBasketEvents()

      trackRemoveFromBasket(item, 2)

      expect(mocks.push).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 59.98,
          ecommerce: { items: [expect.objectContaining({ quantity: 2 })] },
        }),
      )
      expect(mocks.track).toHaveBeenCalledWith(
        'remove_from_basket',
        expect.objectContaining({ quantity: 2 }),
      )
    })
  })

  describe('trackViewBasket', () => {
    it('pushes view_cart with all basket items, currency, value, and one-based indexes', () => {
      const basket = createBasket(
        [
          createItem({ key: 'a', product: { ...createItem().product, id: 1 } }),
          createItem({ key: 'b', product: { ...createItem().product, id: 2 } }),
        ],
        { finalPriceInCents: 2999 },
      )

      const { trackViewBasket } = useBasketEvents()
      trackViewBasket(basket)

      expect(mocks.push).toHaveBeenCalledTimes(1)
      const event = mocks.push.mock.calls[0]?.[0]
      expect(event.event).toBe('view_cart')
      expect(event.currency).toBe('EUR')
      expect(event.value).toBeCloseTo(29.99)
      expect(event.ecommerce.items).toHaveLength(2)
      expect(event.ecommerce.items[0].index).toBe(1)
      expect(event.ecommerce.items[1].index).toBe(2)
    })

    it('tracks the SCAYLE view_basket once with the reduction sums and every line', () => {
      const basket = createBasket(
        [
          createItem({
            key: 'a',
            quantity: 2,
            promotions: [createMockPromotion({ id: 'promo-a' })],
          }),
          createItem({
            key: 'b',
            status: 'unavailable',
            product: { ...createItem().product, id: 2 },
          }),
        ],
        {
          finalPriceInCents: 8997,
          saleReductionSumInCents: 1500,
          campaignReductionSumInCents: 1000,
          promotionReductionSumInCents: 500,
        },
      )

      const { trackViewBasket } = useBasketEvents()
      trackViewBasket(basket)

      expect(mocks.track).toHaveBeenCalledTimes(1)
      expect(mocks.track).toHaveBeenCalledWith('view_basket', {
        total_price: 8997,
        total_sale_discount: 1500,
        total_campaign_discount: 1000,
        total_promotions_discount: 500,
        products: [
          expect.objectContaining({
            product_id: '1',
            variant_id: '10',
            quantity: 2,
            promotion_ids: ['promo-a'],
            position: 1,
            total: 2,
          }),
          expect.objectContaining({
            product_id: '2',
            quantity: 1,
            promotion_ids: [],
            position: 2,
            total: 2,
          }),
        ],
      })
    })

    it('reports the active campaign on view_basket lines with a campaign reduction', () => {
      mocks.page!.props.campaign = createMockCampaign({ id: '31' })
      const reduced = createItem({ key: 'a' })
      reduced.unitPrice.hasCampaignReduction = true
      const basket = createBasket([reduced, createItem({ key: 'b' })])
      const { trackViewBasket } = useBasketEvents()

      trackViewBasket(basket)

      expect(mocks.track).toHaveBeenCalledWith(
        'view_basket',
        expect.objectContaining({
          products: [
            expect.objectContaining({ campaign_id: '31' }),
            expect.objectContaining({ campaign_id: undefined }),
          ],
        }),
      )
    })
  })

  describe('trackBeginCheckout', () => {
    it('pushes begin_checkout with currency, value, and the available lines with one-based indexes', () => {
      const basket = createBasket(
        [
          createItem({ key: 'a', quantity: 2 }),
          createItem({
            key: 'b',
            status: 'unavailable',
            product: { ...createItem().product, id: 2 },
          }),
          createItem({ key: 'c', product: { ...createItem().product, id: 3 } }),
        ],
        { finalPriceInCents: 8997 },
      )
      const { trackBeginCheckout } = useBasketEvents()

      trackBeginCheckout(basket)

      expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
        event: 'begin_checkout',
        currency: 'EUR',
        value: 89.97,
        ecommerce: {
          items: [
            expect.objectContaining({ item_id: '1', quantity: 2, index: 1 }),
            expect.objectContaining({ item_id: '3', quantity: 1, index: 2 }),
          ],
        },
      })
    })

    it('reports the applied promotion codes as a comma-separated coupon', () => {
      const basket = {
        ...createBasket([createItem()]),
        promotionCodes: [
          createMockPromotion({ id: 'promo-a', code: 'WELCOME10' }),
          createMockPromotion({ id: 'promo-b', code: 'FREESHIP' }),
        ],
      }
      const { trackBeginCheckout } = useBasketEvents()

      trackBeginCheckout(basket)

      expect(mocks.push).toHaveBeenCalledWith(
        expect.objectContaining({ coupon: 'WELCOME10,FREESHIP' }),
      )
    })

    it('omits the coupon when no promotion code is applied', () => {
      const { trackBeginCheckout } = useBasketEvents()

      trackBeginCheckout(createBasket([createItem()]))

      expect(mocks.push.mock.calls[0]?.[0]).not.toHaveProperty('coupon')
    })

    it('pushes nothing for a basket without available lines', () => {
      const basket = createBasket([createItem({ status: 'unavailable' })])
      const { trackBeginCheckout } = useBasketEvents()

      trackBeginCheckout(basket)

      expect(mocks.push).not.toHaveBeenCalled()
    })

    it('tracks no SCAYLE Analytics event', () => {
      const { trackBeginCheckout } = useBasketEvents()

      trackBeginCheckout(createBasket([createItem()]))

      expect(mocks.track).not.toHaveBeenCalled()
    })
  })

  describe('trackCheckoutStep', () => {
    it('pushes add_shipping_info with the shipping tier and the begin_checkout items and value', () => {
      const basket = {
        ...createBasket(
          [
            createItem({ key: 'a', quantity: 2 }),
            createItem({
              key: 'b',
              status: 'unavailable',
              product: { ...createItem().product, id: 2 },
            }),
          ],
          { finalPriceInCents: 5998 },
        ),
        promotionCodes: [createMockPromotion({ code: 'WELCOME10' })],
      }
      const { trackBeginCheckout, trackCheckoutStep } = useBasketEvents()
      trackBeginCheckout(basket)
      const beginCheckout = mocks.push.mock.calls[0]?.[0]

      const pushed = trackCheckoutStep('add_shipping_info', basket, {
        shipping_tier: 'DEFAULT',
      })

      expect(pushed).toBe(true)
      expect(mocks.push).toHaveBeenLastCalledWith({
        event: 'add_shipping_info',
        currency: 'EUR',
        value: beginCheckout.value,
        coupon: 'WELCOME10',
        shipping_tier: 'DEFAULT',
        ecommerce: beginCheckout.ecommerce,
      })
    })

    it('pushes add_payment_info with the payment type and the begin_checkout items and value', () => {
      const basket = createBasket([createItem({ quantity: 2 })], {
        finalPriceInCents: 5998,
      })
      const { trackBeginCheckout, trackCheckoutStep } = useBasketEvents()
      trackBeginCheckout(basket)
      const beginCheckout = mocks.push.mock.calls[0]?.[0]

      trackCheckoutStep('add_payment_info', basket, { payment_type: 'paypal' })

      expect(mocks.push).toHaveBeenLastCalledWith({
        event: 'add_payment_info',
        currency: 'EUR',
        value: beginCheckout.value,
        payment_type: 'paypal',
        ecommerce: beginCheckout.ecommerce,
      })
    })

    it('pushes nothing and returns false for a basket without available lines', () => {
      const { trackCheckoutStep } = useBasketEvents()

      const pushed = trackCheckoutStep(
        'add_payment_info',
        createBasket([createItem({ status: 'unavailable' })]),
        { payment_type: 'paypal' },
      )

      expect(pushed).toBe(false)
      expect(mocks.push).not.toHaveBeenCalled()
    })
  })
})
