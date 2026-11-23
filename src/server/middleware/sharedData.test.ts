import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { CampaignsService } from '@scayle/storefront/services'
import type { CustomerBase } from '@scayle/storefront/types'

import {
  createMockMapperRegistry,
  createMockSSRRenderContext,
  createMockServiceRegistry,
  createMockSession,
  createMockStorefrontContext,
} from '../../test/utils/context'

import { sharedDataMiddleware } from './sharedData'

const { logError } = vi.hoisted(() => ({
  logError: vi.fn(),
}))

// The middleware's only observable output on the prop-failure paths is what it
// logs, so the logger is a double rather than the real tslog instance.
vi.mock('@scayle/storefront/shared', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@scayle/storefront/shared')>()
  return {
    ...actual,
    createLogger: () => ({ error: logError }),
  }
})

function createMockInertia() {
  return {
    share: vi.fn(),
  }
}

function createMiddlewareContext(
  storefront: ReturnType<typeof createMockStorefrontContext>,
  {
    customer,
    campaigns,
    isRouteCacheable = false,
  }: {
    customer?: CustomerBase
    campaigns?: CampaignsService
    isRouteCacheable?: boolean
  } = {},
) {
  const inertia = createMockInertia()
  const session = createMockSession({ customer })
  const services = {
    campaigns: campaigns ?? {
      fetchActiveCampaign: vi.fn().mockResolvedValue(null),
    },
    navigation: {
      fetchHeaderNavigation: vi.fn().mockResolvedValue([]),
      fetchFooterNavigation: vi
        .fn()
        .mockResolvedValue({ footer: [], bottomFooter: [] }),
    },
    basket: {
      getBasketKey: vi.fn().mockReturnValue('basket-key'),
      fetchBasket: vi.fn().mockResolvedValue({ items: [] }),
    },
    wishlist: {
      fetchWishlist: vi.fn().mockResolvedValue({ items: [] }),
    },
    cms: { getCMSEditorData: vi.fn().mockReturnValue(undefined) },
    promotions: { fetchActivePromotions: vi.fn().mockResolvedValue([]) },
    country: {
      getAvailableCountries: vi.fn().mockReturnValue([]),
      getAvailableLanguages: vi.fn().mockReturnValue([]),
      getShopSuggestion: vi.fn().mockReturnValue(undefined),
    },
  }
  const ctx = createMockSSRRenderContext({
    url: 'https://shop.example.com/?utm_source=newsletter',
    variables: {
      inertia,
      storefront,
      services: createMockServiceRegistry(services),
      mappers: createMockMapperRegistry(storefront, {
        wishlist: {
          getWishlistKey: vi.fn().mockReturnValue('wishlist-key'),
        },
      }),
      session,
      request: { isRouteCacheable },
    },
  })

  return { ctx, inertia, session, services }
}

type Services = ReturnType<typeof createMiddlewareContext>['services']

/**
 * Runs the middleware against a context from {@link createMiddlewareContext} and
 * returns the props it shared.
 */
async function runMiddleware({
  ctx,
  inertia,
}: ReturnType<typeof createMiddlewareContext>) {
  await sharedDataMiddleware(ctx, () => Promise.resolve())
  return inertia.share.mock.calls[0]![0]
}

describe('sharedDataMiddleware', () => {
  describe('shared Inertia props', () => {
    it('shares every prop as a once prop, so it resolves at most once per session', async () => {
      const context = createMiddlewareContext(createMockStorefrontContext())

      const sharedProps = await runMiddleware(context)

      const notOnce = Object.keys(sharedProps).filter(
        (key) => typeof sharedProps[key].isOnce !== 'object',
      )
      expect(notOnce).toEqual([])
    })

    it('shares the country service results as availableCountries and availableLanguages', async () => {
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)
      const { services } = context
      const countries = [{ name: 'Germany', code: 'DE', languages: [] }]
      const languages = [
        { code: 'de', name: 'Deutsch', locale: 'de-DE', url: '/de' },
      ]
      services.country.getAvailableCountries.mockReturnValue(countries)
      services.country.getAvailableLanguages.mockReturnValue(languages)

      const sharedProps = await runMiddleware(context)
      expect(sharedProps.availableCountries.callback()).toBe(countries)
      expect(sharedProps.availableLanguages.callback()).toBe(languages)
    })

    it('shares shopSuggestion as a deferred once prop from the country service', async () => {
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)
      const { services } = context
      const suggestion = {
        region: 'US',
        languages: [
          {
            code: 'en',
            name: 'English',
            locale: 'en-US',
            url: 'https://example.com/en',
          },
        ],
      }
      services.country.getShopSuggestion.mockReturnValue(suggestion)

      const { shopSuggestion } = await runMiddleware(context)
      expect(shopSuggestion.isDeferred).toMatchObject({ group: 'customer' })
      expect(shopSuggestion.callback()).toBe(suggestion)
    })

    it('shares shopSuggestion as null when there is nothing to suggest', async () => {
      // Inertia drops undefined values, so the client could not tell
      // "nothing to suggest" from "not loaded yet".
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)

      const sharedProps = await runMiddleware(context)
      expect(sharedProps.shopSuggestion.callback()).toBeNull()
    })

    it('degrades a failed navigation fetch (undefined) to empty arrays', async () => {
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)
      const { services } = context
      services.navigation.fetchHeaderNavigation.mockResolvedValue(undefined)
      services.navigation.fetchFooterNavigation.mockResolvedValue({
        footer: undefined,
        bottomFooter: undefined,
      })

      const sharedProps = await runMiddleware(context)
      await expect(sharedProps.navigation.callback()).resolves.toEqual([])
      await expect(sharedProps.footer.callback()).resolves.toEqual({
        footer: [],
        bottomFooter: [],
      })
    })
  })

  describe('non-critical prop failures', () => {
    it.for([
      {
        prop: 'basket',
        fallback: null,
        fetch: (services: Services) => services.basket.fetchBasket,
      },
      {
        prop: 'wishlist',
        fallback: null,
        fetch: (services: Services) => services.wishlist.fetchWishlist,
      },
      {
        prop: 'promotions',
        fallback: [],
        fetch: (services: Services) =>
          services.promotions.fetchActivePromotions,
      },
    ])(
      'resolves the $prop prop to $fallback and logs when the fetch rejects',
      async ({ prop, fallback, fetch }) => {
        const context = createMiddlewareContext(createMockStorefrontContext())
        fetch(context.services).mockRejectedValue(new Error('SAPI down'))

        const sharedProps = await runMiddleware(context)

        await expect(sharedProps[prop].callback()).resolves.toEqual(fallback)
        expect(logError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Failed to fetch ${prop} for shared prop`,
          }),
        )
      },
    )

    it('resolves the campaign prop to null and keeps its TTL when the Storefront API fails', async () => {
      // The real service: the prop has no catch of its own and relies on the
      // service never rejecting.
      vi.useFakeTimers({ now: 0, toFake: ['Date'] })
      onTestFinished(() => {
        vi.useRealTimers()
      })
      const storefront = createMockStorefrontContext({
        storefrontAPI: {
          campaigns: { get: vi.fn().mockRejectedValue(new Error('SAPI down')) },
        },
      })
      const context = createMiddlewareContext(storefront, {
        campaigns: new CampaignsService(
          storefront,
          createMockMapperRegistry(storefront),
        ),
      })

      const { campaign } = await runMiddleware(context)

      await expect(campaign.callback()).resolves.toBeNull()
      expect(campaign.isOnce.expiresAt).toEqual(
        new Date(CampaignsService.CAMPAIGN_CACHE_TTL_SECONDS * 1000),
      )
    })

    it('fetches promotions anonymously when the session token is malformed', async () => {
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)
      const { services, session } = context
      const promotions = [{ id: 'promo-1' }]
      services.promotions.fetchActivePromotions.mockResolvedValue(promotions)
      vi.spyOn(session, 'get').mockImplementation((key: string) =>
        key === 'accessToken' ? 'not-a-jwt' : undefined,
      )

      const sharedProps = await runMiddleware(context)
      await expect(sharedProps.promotions.callback()).resolves.toEqual(
        promotions,
      )
      expect(services.promotions.fetchActivePromotions).toHaveBeenCalledWith(
        undefined,
      )
    })

    it('passes the basket and wishlist keys from the session through to the services', async () => {
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)
      const { services, session } = context
      const basket = { items: [] }
      const wishlist = { items: [] }
      services.basket.fetchBasket.mockResolvedValue(basket)
      services.wishlist.fetchWishlist.mockResolvedValue(wishlist)

      const sharedProps = await runMiddleware(context)
      await expect(sharedProps.basket.callback()).resolves.toBe(basket)
      await expect(sharedProps.wishlist.callback()).resolves.toBe(wishlist)
      expect(services.basket.getBasketKey).toHaveBeenCalledWith(session)
      expect(services.basket.fetchBasket).toHaveBeenCalledWith('basket-key')
      expect(services.wishlist.fetchWishlist).toHaveBeenCalledWith(
        'wishlist-key',
      )
    })
  })

  describe('customer prop', () => {
    it('shares null rather than undefined for a session without a customer', async () => {
      // Inertia drops undefined values from the response, which would leave a
      // signed-out client still holding the previous customer.
      const storefront = createMockStorefrontContext()
      const context = createMiddlewareContext(storefront)

      const sharedProps = await runMiddleware(context)
      // The callback is synchronous, so the shared value is the return itself.
      expect(sharedProps.customer.callback()).toBeNull()
    })

    it('shares the session customer when one is signed in', async () => {
      const storefront = createMockStorefrontContext()
      const segments = [
        { id: 'segment-guid', name: 'VIP', referenceKey: 'vip' },
      ]
      const customer = { id: 42, segments } as CustomerBase
      const context = createMiddlewareContext(storefront, { customer })

      const sharedProps = await runMiddleware(context)
      expect(sharedProps.customer.callback()).toEqual({ id: 42, segments })
    })

    it('shares an empty segment list for a session customer stored without segments', async () => {
      const storefront = createMockStorefrontContext()
      const customer = { id: 42 } as CustomerBase
      const context = createMiddlewareContext(storefront, { customer })

      const sharedProps = await runMiddleware(context)
      expect(sharedProps.customer.callback()).toEqual({ id: 42, segments: [] })
    })

    it('defers the customer on a cacheable render', async () => {
      const context = createMiddlewareContext(createMockStorefrontContext(), {
        isRouteCacheable: true,
      })

      const sharedProps = await runMiddleware(context)
      expect(sharedProps.customer.isDeferred).toMatchObject({
        group: 'customer',
      })
    })

    it('sends the customer with the page on a non-cacheable render', async () => {
      const context = createMiddlewareContext(createMockStorefrontContext(), {
        isRouteCacheable: false,
      })

      const sharedProps = await runMiddleware(context)
      expect(sharedProps.customer.isDeferred).toBe(false)
    })
  })
})
