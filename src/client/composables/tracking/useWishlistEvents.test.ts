import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  Campaign,
  ListingProduct,
  VariantPrice,
} from '@scayle/storefront/types'
import { useWishlistEvents } from './useWishlistEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  track: vi.fn(),
  page: null as {
    props: {
      storefront: { country: { currency: { currencyCode: string } } }
      campaign?: Campaign | null
    }
  } | null,
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
  }) as {
    props: {
      storefront: { country: { currency: { currencyCode: string } } }
      campaign?: Campaign | null
    }
  }
  return {
    usePage: () => mocks.page,
  }
})

const price: VariantPrice = {
  finalPrice: '€29.99',
  originalPrice: '€39.99',
  finalPriceInCents: 2999,
  originalPriceInCents: 3999,
  strikeThroughPrices: [],
  isOnSale: false,
  showOriginally: false,
  showLowestPriorPriceLine: false,
  strikeOriginally: false,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  currency: 'EUR',
}

const product: ListingProduct = {
  id: 42,
  name: 'Test Product',
  link: '/p/test-42',
  brand: 'Test Brand',
  price: { ...price, hasDifferentPrices: false },
  isSoldOut: false,
  isNew: false,
  isLowStock: false,
  color: '',
  images: [
    {
      applyPadding: false,
      url: 'https://cdn.example.com/images/h.png',
      name: 'h.jpg',
    },
  ],
  siblings: [],
  sellableTimeframe: { state: 'active' },
  attributeValuesByGroup: {},
}

const surface = {
  product_list_type: 'category',
  product_list_id: '123',
} as const

describe('useWishlistEvents', () => {
  beforeEach(() => {
    if (mocks.page) {
      mocks.page.props.storefront = {
        country: { currency: { currencyCode: 'EUR' } },
      }
      mocks.page.props.campaign = null
    }
  })

  describe('trackAddToWishlist', () => {
    it('pushes add_to_wishlist with currency, value, and the mapped product item on its surface', () => {
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(product, surface)

      expect(mocks.push).toHaveBeenCalledTimes(1)
      expect(mocks.push).toHaveBeenCalledWith({
        event: 'add_to_wishlist',
        currency: 'EUR',
        value: 29.99,
        ecommerce: {
          items: [
            expect.objectContaining({
              item_id: '42',
              item_name: 'Test Product',
              item_brand: 'Test Brand',
              price: 29.99,
              item_list_id: '123',
              item_list_name: 'category',
            }),
          ],
        },
      })
    })

    it('leaves quantity and index out of the item without an index', () => {
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(product, surface)

      const [item] = mocks.push.mock.calls[0]![0].ecommerce.items
      expect(item.quantity).toBeUndefined()
      expect(item.index).toBeUndefined()
    })

    it('leaves the list fields out for the PDP surface', () => {
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(product, {
        product_list_type: null,
        product_list_id: null,
      })

      const [item] = mocks.push.mock.calls[0]![0].ecommerce.items
      expect(item.item_list_id).toBeUndefined()
      expect(item.item_list_name).toBeUndefined()
    })

    it('forwards the caller-provided index onto ecommerce.items[0].index', () => {
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(product, surface, 3)

      expect(mocks.push).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'add_to_wishlist',
          ecommerce: {
            items: [expect.objectContaining({ index: 3 })],
          },
        }),
      )
    })

    it('tracks the SCAYLE add_to_wishlist once with the surface', () => {
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(product, surface)

      expect(mocks.track).toHaveBeenCalledTimes(1)
      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_wishlist',
        expect.objectContaining({
          product_list_type: 'category',
          product_list_id: '123',
        }),
      )
    })

    it('reports the active campaign on add_to_wishlist for a campaign-priced product', () => {
      mocks.page!.props.campaign = { id: '31' } as Campaign
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(
        { ...product, price: { ...product.price, hasCampaignReduction: true } },
        surface,
      )

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_wishlist',
        expect.objectContaining({ campaign_id: '31' }),
      )
    })

    it('passes a null surface through for the PDP main item', () => {
      const { trackAddToWishlist } = useWishlistEvents()

      trackAddToWishlist(product, {
        product_list_type: null,
        product_list_id: undefined,
      })

      expect(mocks.track).toHaveBeenCalledWith(
        'add_to_wishlist',
        expect.objectContaining({
          product_list_type: null,
          product_list_id: undefined,
        }),
      )
    })
  })
})
