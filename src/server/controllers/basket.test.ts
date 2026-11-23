import { describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type {
  Basket,
  BuyXGetYEffect,
  GiftPromotion,
  Promotion,
} from '@scayle/storefront/types'
import type { SSRRenderContext } from '@scayle/storefront'
import type { SEOMeta } from '@shared/types/SEO'
import { withShopName } from '@server/utils/seo'
import { createMockBasket } from '../../test/mock-data/basket'
import { createMockDetailedProduct } from '../../test/mock-data/products'
import { createMockPromotion } from '../../test/mock-data/promotions'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSession,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { BasketController } from './basket'

vi.mock('jose', () => ({
  decodeJwt: vi.fn((token: string) =>
    token === 'session-access-token'
      ? { exp: Math.floor(Date.now() / 1000) + 3600 }
      : {},
  ),
}))

const PANEL_DELIVERY_COSTS = {
  value: 'from €4.99',
  disclaimer: '* Delivery fees will be determined during checkout',
}
const DEFAULT_DELIVERY_COSTS = {
  value: 'from €0.00',
  disclaimer: '* Default disclaimer',
}

interface BasketProps {
  basket: Basket
  checkoutJwt: () => Promise<string>
  accessToken: () => string
  deliveryCosts: () => Promise<unknown>
  giftPromotions: () => Promise<GiftPromotion[]>
  meta: () => Promise<SEOMeta>
}

function createContext({
  url = 'https://shop.example.com/de/basket',
  basket = createMockBasket(),
  session = createMockSession(),
  getShopConfiguration = vi.fn().mockResolvedValue({
    name: 'Test Shop',
    deliveryCost: PANEL_DELIVERY_COSTS,
  }),
  fetchGifts = vi.fn(),
  fetchActivePromotions = vi.fn(),
}: {
  url?: string
  basket?: Basket
  session?: ReturnType<typeof createMockSession>
  getShopConfiguration?: Mock
  fetchGifts?: Mock
  fetchActivePromotions?: Mock
} = {}): SSRRenderContext {
  const storefront = createMockStorefrontContext()
  return createMockSSRRenderContext({
    url,
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront, {
        shopConfig: { mapDeliveryCost: vi.fn(() => DEFAULT_DELIVERY_COSTS) },
      }),
      services: createMockServiceRegistry({
        basket: {
          getBasketKey: vi.fn(() => 'basket-key'),
          fetchBasket: vi.fn().mockResolvedValue(basket),
        },
        checkout: {
          generateCheckoutJwt: vi.fn().mockResolvedValue('checkoutJWT'),
        },
        shopConfig: {
          getShopConfiguration,
          getShopName: vi.fn().mockResolvedValue('Test Shop'),
        },
        gifts: { fetchGifts },
        promotions: { fetchActivePromotions },
      }),
      session,
    },
  })
}

async function renderProps(ctx: SSRRenderContext): Promise<BasketProps> {
  await new BasketController(ctx).view()
  return vi.mocked(ctx.render).mock.calls[0]![1] as BasketProps
}

/** Builds a Buy X Get Y promotion whose reward is the given gift variants. */
function createGiftPromotion(
  id: string,
  variantIds: number[],
): Promotion<BuyXGetYEffect> {
  return {
    ...createMockPromotion({ id }),
    effect: {
      type: 'buy_x_get_y',
      eligibleItemsQuantity: 1,
      variantIds,
      applicableItemSelectionType: 'variant_ids',
      discountType: 'relative',
      value: '-100%',
      isFree: true,
    },
  }
}

describe('basket controller', () => {
  // The page renders from this prop, not the shared basket one, which is
  // mapped without each line's other variants. Dropping it here leaves the size
  // selector with nothing to pick.
  it('hands the page the basket it fetched', async () => {
    const basket = createMockBasket()
    const ctx = createContext({ basket })

    const props = await renderProps(ctx)

    expect(ctx.render).toHaveBeenCalledWith('Basket', expect.anything())
    // Sent with the first response rather than deferred: `view()` has already
    // fetched it, and deferring made the client fetch the same basket a second
    // time.
    expect(props.basket).toBe(basket)
  })

  it('builds noindex meta with the shop name and a canonical link without query parameters', async () => {
    const ctx = createContext({
      url: 'https://shop.example.com/de/basket?utm_source=newsletter',
    })
    const { i18n } = ctx.get('mappers')!

    const props = await renderProps(ctx)

    await expect(props.meta()).resolves.toEqual({
      title: withShopName(i18n, i18n.t('basket_page.meta.title'), 'Test Shop'),
      description: i18n.t('basket_page.meta.description'),
      robots: 'noindex, nofollow',
      canonicalLink: {
        rel: 'canonical',
        key: 'canonical',
        href: 'https://shop.example.com/de/basket',
      },
    })
  })

  it('resolves the checkout JWT signed by the checkout service', async () => {
    const props = await renderProps(createContext())

    await expect(props.checkoutJwt()).resolves.toBe('checkoutJWT')
  })

  it('resolves the access token of the session', async () => {
    const props = await renderProps(createContext())

    expect(props.accessToken()).toBe('session-access-token')
  })

  it('renders an empty access token when the session has none', async () => {
    // The checkout web component takes a string prop, so an anonymous visitor
    // gets `''` rather than `undefined` being dropped from the payload.
    const props = await renderProps(
      createContext({ session: createMockSession({ accessToken: undefined }) }),
    )

    expect(props.accessToken()).toBe('')
  })

  it('resolves the delivery costs of the shop configuration', async () => {
    const props = await renderProps(createContext())

    await expect(props.deliveryCosts()).resolves.toEqual(PANEL_DELIVERY_COSTS)
  })

  it('falls back to the default delivery costs of the shop config mapper when the shop configuration cannot be read', async () => {
    const props = await renderProps(
      createContext({
        getShopConfiguration: vi.fn().mockResolvedValue(undefined),
      }),
    )

    await expect(props.deliveryCosts()).resolves.toEqual(DEFAULT_DELIVERY_COSTS)
  })

  it('does not fetch the active promotions', async () => {
    // The banner list is derived client-side from the shared, customer-scoped
    // `promotions` prop, so the controller never fetches promotions itself.
    const fetchActivePromotions = vi.fn()

    await renderProps(createContext({ fetchActivePromotions }))

    expect(fetchActivePromotions).not.toHaveBeenCalled()
  })

  describe('gift promotions', () => {
    async function resolveGiftPromotions(
      giftPromotions: Promotion<BuyXGetYEffect>[],
      fetchGifts: Mock,
    ): Promise<GiftPromotion[]> {
      const props = await renderProps(
        createContext({
          basket: createMockBasket({ giftPromotions }),
          fetchGifts,
        }),
      )
      return props.giftPromotions()
    }

    it('resolves a gift row for every Buy X Get Y promotion on the basket', async () => {
      const promotionA = createGiftPromotion('p1', [10])
      const promotionB = createGiftPromotion('p2', [20])
      const productA = createMockDetailedProduct({ id: 1 })
      const productB = createMockDetailedProduct({ id: 2 })
      const fetchGifts = vi
        .fn()
        .mockResolvedValueOnce({ promotion: promotionA, products: [productA] })
        .mockResolvedValueOnce({ promotion: promotionB, products: [productB] })

      const giftPromotions = await resolveGiftPromotions(
        [promotionA, promotionB],
        fetchGifts,
      )

      expect(fetchGifts).toHaveBeenNthCalledWith(1, promotionA)
      expect(fetchGifts).toHaveBeenNthCalledWith(2, promotionB)
      expect(giftPromotions).toEqual([
        { promotion: promotionA, products: [productA] },
        { promotion: promotionB, products: [productB] },
      ])
    })

    it('drops a gift row that has no reward products', async () => {
      const promotion = createGiftPromotion('bxgy-1', [10])
      const fetchGifts = vi.fn().mockResolvedValue({ promotion, products: [] })

      await expect(
        resolveGiftPromotions([promotion], fetchGifts),
      ).resolves.toEqual([])
    })

    it('resolves no gift rows when the gift fetch rejects', async () => {
      const fetchGifts = vi
        .fn()
        .mockRejectedValue(new Error('gift service down'))

      await expect(
        resolveGiftPromotions(
          [createGiftPromotion('bxgy-1', [10])],
          fetchGifts,
        ),
      ).resolves.toEqual([])
    })
  })
})
