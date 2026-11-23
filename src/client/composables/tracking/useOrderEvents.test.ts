import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Order } from '@scayle/storefront/types'
import {
  createMockOrder,
  createMockOrderDelivery,
  createMockOrderItem,
  defaultCost,
  defaultItemPrice,
  defaultProduct,
} from '@test/mock-data/orders'
import { useOrderEvents } from './useOrderEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('@client/composables/useConsent', () => ({
  useConsent: () => ({ consent: { value: false } }),
}))

vi.mock('@client/composables/useConsentManager', () => ({
  useConsentManager: () => ({ cmpPending: ref(false) }),
}))

const purchaseOrder = (): Order =>
  createMockOrder({
    id: 449595003,
    payment: [{ key: 'paypal' }],
    cost: {
      ...defaultCost,
      currency: 'EUR',
      finalPriceInCents: 23961,
      taxInCents: 1490,
      shippingCostInCents: 483,
      saleReductionSumInCents: 12000,
      campaignReductionSumInCents: 5000,
      promotionReductionSumInCents: 3000,
      deliveryOption: 'home_delivery',
    },
    deliveries: [
      createMockOrderDelivery({
        carrierKey: 'dhl',
        items: [
          createMockOrderItem({
            quantity: 2,
            product: {
              ...defaultProduct,
              id: 205627,
              name: "Dress 'Adicolor Classics'",
              brand: 'Adidas',
            },
            variant: { size: 'M' },
            price: {
              ...defaultItemPrice,
              currency: 'EUR',
              finalPriceInCents: 11990,
              originalPriceInCents: 21990,
            },
          }),
        ],
      }),
    ],
  })

describe('useOrderEvents', () => {
  describe('trackPurchase', () => {
    it('pushes the GA4 purchase with the order totals and the discount extras', async () => {
      const { trackPurchase } = useOrderEvents()

      await trackPurchase(purchaseOrder())

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'purchase',
        total_sale_discount: 120,
        total_campaign_discount: 50,
        total_promotions_discount: 30,
        payment_method: 'paypal',
        carrier: 'dhl',
        delivery_option: 'home_delivery',
        ecommerce: {
          transaction_id: '449595003',
          currency: 'EUR',
          value: 239.61,
          tax: 14.9,
          shipping: 4.83,
          items: [
            {
              item_id: '205627',
              item_name: "Dress 'Adicolor Classics'",
              price: 119.9,
              quantity: 2,
              index: 1,
              item_brand: 'Adidas',
              item_variant: 'M',
              discount: 100,
            },
          ],
        },
      })
    })

    it('omits payment, carrier and delivery option when the order has none', async () => {
      const { trackPurchase } = useOrderEvents()

      await trackPurchase(
        createMockOrder({
          payment: [],
          deliveries: [],
          cost: { ...defaultCost, deliveryOption: undefined },
        }),
      )

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'purchase',
        total_sale_discount: 0,
        total_campaign_discount: 0,
        total_promotions_discount: 0,
        ecommerce: {
          transaction_id: '98765',
          currency: 'USD',
          value: 53.99,
          tax: 0,
          shipping: 4.99,
          items: [],
        },
      })
    })
  })
})
