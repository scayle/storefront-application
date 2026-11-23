// cspell:ignore Платье
import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { FetchError, SmartSortingKey } from '@scayle/storefront-api'
import { GiftService, PromotionsService } from '@scayle/storefront/services'
import type { SSRRenderContext, StorefrontContext } from '@scayle/storefront'
import type { DetailedProduct } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import { buildProductDetailRoute } from '@shared/routes'
import type { MockStorefrontContextOverrides } from '../../test/utils/context'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSession,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import {
  createMockDetailedProduct,
  createMockListingProduct,
} from '../../test/mock-data/products'
import { PromotionMapperService } from '../services/mappers/promotion-mapper'
import { ProductMapperService } from '../services/mappers/product-mapper'
import { CategoryMapperService } from '../services/mappers/category-mapper'
import { ProductDetailController } from './product-detail'

const { errorLogMock } = vi.hoisted(() => ({ errorLogMock: vi.fn() }))
vi.mock('@scayle/storefront/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@scayle/storefront/shared')>()),
  createLogger: () => ({
    error: errorLogMock,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

let mockFetchProduct: Mock
let mockFetchProductHreflangs: Mock
let mockFetchSimilarProducts: Mock
let mockFetchCategoryRecommendations: Mock
let mockFetchVariantPrices: Mock

function createMockContext(overrides: {
  identifier?: string
  url?: string
  storefront?: StorefrontContext
  accessToken?: string
}): SSRRenderContext {
  const storefront = overrides.storefront ?? createMockStorefrontContext()

  // Mirror the registry middleware: expose the services the controller resolves
  // via `services.{productDetail,recommendations,promotions,gifts}` and the
  // `product` mapper slot, all wired to the mock storefront.
  const mappers = createMockMapperRegistry(storefront, {
    category: new CategoryMapperService(storefront),
  })
  Object.assign(mappers, {
    product: new ProductMapperService(storefront, mappers),
  })

  return createMockSSRRenderContext({
    url: overrides.url ?? 'https://example.com/p/foo-42',
    params: { identifier: overrides.identifier ?? 'foo-42' },
    variables: {
      storefront,
      mappers,
      services: createMockServiceRegistry({
        productDetail: {
          fetchProduct: mockFetchProduct,
          fetchProductHreflangs: mockFetchProductHreflangs,
        },
        recommendations: {
          fetchSimilarProducts: mockFetchSimilarProducts,
          fetchCategoryRecommendations: mockFetchCategoryRecommendations,
        },
        promotions: new PromotionsService(storefront, {
          promotion: new PromotionMapperService(storefront),
        }),
        gifts: new GiftService(
          storefront,
          mappers,
          createMockServiceRegistry({
            campaigns: {
              getActiveCampaignKey: vi.fn().mockResolvedValue(undefined),
            },
          }),
        ),
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        subscription: { fetchVariantPrices: mockFetchVariantPrices },
      }),
      session: createMockSession({ accessToken: overrides.accessToken }),
      inertia: { navigate: vi.fn() },
    },
  })
}

async function runView(ctx: SSRRenderContext) {
  return new ProductDetailController(ctx).view()
}

describe('ProductDetailController', () => {
  beforeEach(() => {
    mockFetchProduct = vi.fn()
    mockFetchProductHreflangs = vi.fn().mockResolvedValue([])
    mockFetchSimilarProducts = vi.fn().mockResolvedValue([])
    mockFetchCategoryRecommendations = vi.fn().mockResolvedValue([])
    mockFetchVariantPrices = vi.fn().mockResolvedValue({})
  })

  describe('render when path matches', () => {
    const productWithMetaShape = {
      id: 42,
      link: '/p/correct-slug-42',
      name: 'Product',
      images: [] as Array<{ large?: { src: string }; tile?: { src: string } }>,
      videos: [] as Array<{ url: string; posterUrl?: string }>,
      breadcrumbs: [] as Array<{ to: string; value: string }>,
      variants: [] as Array<unknown>,
      attributeValuesByGroup: {} as Record<string, number[]>,
    }

    it.for<{
      case: string
      url: string
      storefront: MockStorefrontContextOverrides
    }>([
      {
        case: 'path country selector',
        url: 'https://example.com/de/p/correct-slug-42',
        storefront: {},
      },
      {
        case: 'domain country selector',
        url: 'https://de.example.com/p/correct-slug-42',
        storefront: { config: { countrySelector: 'domain' } },
      },
      {
        case: 'path_except_default country selector, country other than the default',
        url: 'https://example.com/de/p/correct-slug-42',
        storefront: { config: { countrySelector: 'path_except_default' } },
      },
      {
        case: 'path_except_default country selector, default country',
        url: 'https://example.com/p/correct-slug-42',
        storefront: {
          config: { countrySelector: 'path_except_default' },
          country: { isDefault: true },
        },
      },
    ])(
      'renders ProductDetail without a redirect when the path is the localized product link ($case)',
      async ({ url, storefront }) => {
        const product = { ...productWithMetaShape }
        mockFetchProduct.mockResolvedValue(product)
        const ctx = createMockContext({
          url,
          storefront: createMockStorefrontContext(storefront),
        })

        await runView(ctx)

        expect(ctx.get('inertia').navigate).not.toHaveBeenCalled()
        expect(ctx.render).toHaveBeenCalledWith(
          'ProductDetail',
          expect.objectContaining({ product }),
        )
      },
    )

    it('renders the product at the link built for a name without Latin letters', async () => {
      const link = buildProductDetailRoute(42, 'Платье')
      const product = { ...productWithMetaShape, link }
      mockFetchProduct.mockResolvedValue(product)
      const ctx = createMockContext({
        url: `https://example.com/de${link}`,
        identifier: link.slice('/p/'.length),
      })

      await runView(ctx)

      expect(mockFetchProduct).toHaveBeenCalledWith(42)
      expect(ctx.get('inertia').navigate).not.toHaveBeenCalled()
      expect(ctx.render).toHaveBeenCalledWith(
        'ProductDetail',
        expect.objectContaining({ product }),
      )
    })

    it('builds the meta title with the shop name suffix, the description, and index, follow robots', async () => {
      mockFetchProduct.mockResolvedValue({ ...productWithMetaShape })
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42',
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      await expect(renderArg.meta()).resolves.toMatchObject({
        title: 'Product | Test Shop',
        description:
          'Buy Product online at Test Shop. Discover the wide selection of other branded products.',
        robots: 'index, follow',
      })
    })

    it('leaves out the description, which names the shop, when the shop name cannot be read', async () => {
      mockFetchProduct.mockResolvedValue({ ...productWithMetaShape })
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42',
      })
      vi.mocked(ctx.get('services')!.shopConfig.getShopName).mockResolvedValue(
        undefined,
      )

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      await expect(renderArg.meta()).resolves.toHaveProperty(
        'description',
        undefined,
      )
    })

    it('strips query parameters that are not allow-listed from the canonical link', async () => {
      mockFetchProduct.mockResolvedValue({ ...productWithMetaShape })
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42?utm_source=foo&page=2',
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      const meta = await renderArg.meta()
      expect(meta.canonicalLink?.href).toBe(
        'https://example.com/de/p/correct-slug-42?page=2',
      )
    })

    it('sends the ProductGroup and BreadcrumbList JSON-LD as a server-only prop', async () => {
      mockFetchProduct.mockResolvedValue({
        ...productWithMetaShape,
        breadcrumbs: [{ to: '/c/shoes-1', value: 'Shoes' }],
      })
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42',
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        jsonLd: { isServerOnly: boolean; callback: () => unknown }
      }
      expect(renderArg.jsonLd.isServerOnly).toBe(true)
      expect(renderArg.jsonLd.callback()).toMatchObject([
        { '@type': 'ProductGroup', productGroupID: '42' },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [{ item: 'https://example.com/de/c/shoes-1' }],
        },
      ])
    })

    it('builds the canonical link and hreflangs from the resolved public request', async () => {
      const product = { ...productWithMetaShape }
      mockFetchProduct.mockResolvedValue(product)
      const ctx = createMockContext({
        url: 'https://shop.example.com/de/p/correct-slug-42',
      })
      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<{ canonicalLink?: { href: string } }>
        hreflangs: { callback: () => unknown }
      }

      // The canonical follows `request.url` (the resolved public page URL),
      // not `ctx.req.url`, which is the distinction the origin resolution
      // introduces.
      const meta = await renderArg.meta()
      expect(meta.canonicalLink).toEqual({
        rel: 'canonical',
        key: 'canonical',
        href: 'https://shop.example.com/de/p/correct-slug-42',
      })

      await renderArg.hreflangs.callback()
      expect(mockFetchProductHreflangs).toHaveBeenCalledWith(42)
    })

    it('defers a giftPromotion prop in the promotion-data group', async () => {
      const product = { ...productWithMetaShape }
      mockFetchProduct.mockResolvedValue(product)
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42',
      })
      await runView(ctx)

      expect(ctx.render).toHaveBeenCalledWith(
        'ProductDetail',
        expect.objectContaining({
          giftPromotion: expect.objectContaining({
            isDeferred: { group: 'promotion-data', clientOnly: false },
          }),
        }),
      )
    })

    it('defers accessToken in the customer-data group', async () => {
      const product = { ...productWithMetaShape }
      mockFetchProduct.mockResolvedValue(product)
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42',
      })
      await runView(ctx)

      // `/p/:identifier` is cacheable, and cacheable full renders skip the
      // session read, so accessToken must be deferred: the deferred auto-fetch
      // is a non-cacheable partial request where the session is available.
      // An eager read here would be empty for every user.
      expect(ctx.render).toHaveBeenCalledWith(
        'ProductDetail',
        expect.objectContaining({
          accessToken: expect.objectContaining({
            isDeferred: { group: 'customer-data', clientOnly: false },
          }),
        }),
      )
    })

    it('resolves the real session token when the deferred prop is fetched', async () => {
      const product = { ...productWithMetaShape }
      mockFetchProduct.mockResolvedValue(product)
      // `jose.decodeJwt` only base64url-decodes the payload (no signature
      // check), so a hand-built token with a far-future `exp` passes the
      // validity guard in `getValidAccessToken`.
      const payload = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString(
        'base64url',
      )
      const token = `header.${payload}.signature`
      const ctx = createMockContext({
        url: 'https://example.com/de/p/correct-slug-42',
        accessToken: token,
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as Record<
        string,
        unknown
      >
      const descriptor = renderArg.accessToken as {
        callback: () => string | undefined
      }
      // The deferred auto-fetch runs as a non-cacheable partial request where
      // the session is available, so it must return the shopper's real token.
      expect(descriptor.callback()).toBe(token)
    })

    describe('subscriptionPrices', () => {
      // Eligibility is derived from the variants: a variant carries
      // `subscription` only when it can be subscribed to.
      function createProduct(isSubscriptionEligible: boolean): DetailedProduct {
        return {
          id: 42,
          link: '/p/correct-slug-42',
          name: 'Product',
          images: [],
          breadcrumbs: [],
          variants: [
            {
              id: 100,
              subscription: isSubscriptionEligible
                ? { intervals: [] }
                : undefined,
            },
          ],
          attributeValuesByGroup: {},
        } as unknown as DetailedProduct
      }

      async function renderProps(
        product: DetailedProduct,
        subscriptionEnabled: boolean,
      ) {
        mockFetchProduct.mockResolvedValue(product)
        const ctx = createMockContext({
          url: 'https://example.com/de/p/correct-slug-42',
          storefront: createMockStorefrontContext({
            country: {
              publicFields: {
                subscriptionEnabled,
                consentManagementRequired: false,
              },
            },
          }),
        })

        await runView(ctx)

        return vi.mocked(ctx.render).mock.calls[0]![1] as Record<
          string,
          unknown
        >
      }

      it('omits the prop when the country has subscriptions switched off', async () => {
        const props = await renderProps(createProduct(true), false)

        expect(props).not.toHaveProperty('subscriptionPrices')
      })

      it('omits the prop when the product is not subscription-eligible', async () => {
        const props = await renderProps(createProduct(false), true)

        expect(props).not.toHaveProperty('subscriptionPrices')
      })

      it('defers the prices from the subscription service when the country and product allow it', async () => {
        const prices = { 100: { finalPrice: '9,99 €' } }
        mockFetchVariantPrices.mockResolvedValue(prices)

        const props = await renderProps(createProduct(true), true)
        const subscriptionPrices = props.subscriptionPrices as {
          callback: () => Promise<unknown>
        }

        await expect(subscriptionPrices.callback()).resolves.toBe(prices)
        expect(mockFetchVariantPrices).toHaveBeenCalledWith(42)
      })
    })

    describe('recommendation resolvers', () => {
      // The link matches the request path, so the controller renders instead
      // of redirecting to the canonical product URL.
      function createProductAtRequestedPath(
        overrides: Partial<DetailedProduct> = {},
      ) {
        return createMockDetailedProduct({
          id: 42,
          link: '/p/correct-slug-42',
          ...overrides,
        })
      }

      async function resolveRecommendations(
        prop: 'similarProducts' | 'trendingProducts',
        product: DetailedProduct,
      ) {
        mockFetchProduct.mockResolvedValue(product)
        const ctx = createMockContext({
          url: 'https://example.com/de/p/correct-slug-42',
        })

        await runView(ctx)

        const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as Record<
          string,
          unknown
        >
        const descriptor = renderArg[prop] as {
          callback: () => Promise<unknown>
        }
        return descriptor.callback()
      }

      it('fetches up to 10 similar products for the product', async () => {
        const similarProducts = [createMockListingProduct({ id: 7 })]
        mockFetchSimilarProducts.mockResolvedValue(similarProducts)

        const result = await resolveRecommendations(
          'similarProducts',
          createProductAtRequestedPath(),
        )

        expect(mockFetchSimilarProducts).toHaveBeenCalledWith(42, { limit: 10 })
        expect(result).toEqual(similarProducts)
      })

      it('resolves similar products to an empty list when the fetch fails', async () => {
        mockFetchSimilarProducts.mockRejectedValue(
          new Error('SAPI unavailable'),
        )

        const result = await resolveRecommendations(
          'similarProducts',
          createProductAtRequestedPath(),
        )

        expect(result).toEqual([])
        expect(errorLogMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to fetch similar products',
          }),
        )
      })

      it('fetches up to 10 trending products from the main category, leaving out the product itself', async () => {
        const trendingProducts = [createMockListingProduct({ id: 8 })]
        mockFetchCategoryRecommendations.mockResolvedValue(trendingProducts)

        const result = await resolveRecommendations(
          'trendingProducts',
          createProductAtRequestedPath({
            mainCategory: { id: 5, name: 'Jackets', link: '/c/jackets-5' },
          }),
        )

        expect(mockFetchCategoryRecommendations).toHaveBeenCalledWith(5, {
          excludeProductId: 42,
          sortingKey: SmartSortingKey.TRENDING,
          limit: 10,
        })
        expect(result).toEqual(trendingProducts)
      })

      it('resolves trending products to an empty list without a fetch when the product has no main category', async () => {
        const result = await resolveRecommendations(
          'trendingProducts',
          createProductAtRequestedPath({ mainCategory: undefined }),
        )

        expect(result).toEqual([])
        expect(mockFetchCategoryRecommendations).not.toHaveBeenCalled()
        // Without the guard, reading the missing category id throws inside the
        // fetch's try block and still resolves to an empty list, so the
        // missing error log is what tells the guard apart from that failure.
        expect(errorLogMock).not.toHaveBeenCalled()
      })

      it('resolves trending products to an empty list when the fetch fails', async () => {
        mockFetchCategoryRecommendations.mockRejectedValue(
          new Error('SAPI unavailable'),
        )

        const result = await resolveRecommendations(
          'trendingProducts',
          createProductAtRequestedPath({
            mainCategory: { id: 5, name: 'Jackets', link: '/c/jackets-5' },
          }),
        )

        expect(result).toEqual([])
        expect(errorLogMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to fetch trending products',
          }),
        )
      })
    })

    describe('giftPromotion resolver', () => {
      const groupId = 3
      const attributeId = 99

      const productWithPromotion = {
        id: 42,
        link: '/p/correct-slug-42',
        name: 'Product',
        images: [],
        breadcrumbs: [],
        variants: [],
        attributeValuesByGroup: { [String(groupId)]: [attributeId] },
      } as unknown as DetailedProduct

      function createStorefrontWithMocks(overrides: {
        promotionsGet?: Mock
        variantsGetByIds?: Mock
        productsGetByIds?: Mock
        basketGet?: Mock
      }) {
        return createMockStorefrontContext({
          storefrontAPI: {
            promotions: {
              get:
                overrides.promotionsGet ??
                vi.fn().mockResolvedValue({ entities: [] }),
            },
            variants: {
              getByIds:
                overrides.variantsGetByIds ?? vi.fn().mockResolvedValue([]),
            },
            products: {
              getByIds:
                overrides.productsGetByIds ?? vi.fn().mockResolvedValue([]),
            },
            basket: {
              get:
                overrides.basketGet ??
                vi
                  .fn()
                  .mockRejectedValue(new Error('basket should not be called')),
            },
          } as never,
          cache: {
            getOrSet: vi
              .fn()
              .mockImplementation(
                async (_key: string, fn: () => Promise<unknown>) => fn(),
              ),
          } as never,
        })
      }

      async function captureGiftPromotionResolver(
        ctx: SSRRenderContext,
      ): Promise<() => Promise<unknown>> {
        await runView(ctx)
        const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as Record<
          string,
          unknown
        >
        const descriptor = renderArg.giftPromotion as {
          callback: () => Promise<unknown>
        }
        return descriptor.callback
      }

      /** Builds a raw Storefront API promotion in the shape the mapper expects. */
      function makeRawApiPromotion(overrides: {
        id?: string
        customData?: Record<string, unknown>
        effect?: Record<string, unknown>
        priority?: number
      }) {
        return {
          id: overrides.id ?? 'promo-1',
          name: 'Test Promotion',
          displayName: 'Test Promotion',
          priority: overrides.priority ?? 1,
          schedule: {
            from: '2024-01-01T00:00:00Z',
            to: '2099-12-31T23:59:59Z',
          },
          customData: overrides.customData ?? {},
          effect: overrides.effect,
        }
      }

      it('returns null when no BXGY promotion targets the product', async () => {
        // An automatic_discount promotion: does not match BXGY filter
        const promotionsGet = vi.fn().mockResolvedValue({
          entities: [
            makeRawApiPromotion({
              id: 'promo-discount',
              effect: {
                type: 'automatic_discount',
                additionalData: { type: 'relative', value: 10 },
              },
            }),
          ],
        })
        const variantsGetByIds = vi.fn()
        const storefront = createStorefrontWithMocks({
          promotionsGet,
          variantsGetByIds,
        })
        mockFetchProduct.mockResolvedValue(productWithPromotion)
        const ctx = createMockContext({
          url: 'https://example.com/de/p/correct-slug-42',
          storefront,
        })

        const resolve = await captureGiftPromotionResolver(ctx)
        const result = await resolve()

        expect(result).toBeNull()
        expect(variantsGetByIds).not.toHaveBeenCalled()
      })

      it('skips a matching BXGY without variant ids and resolves the gift promotion behind it', async () => {
        // The decoy sorts first, so a gate that takes the first promotion or
        // the first BXGY resolves null instead of the gift.
        const promotionsGet = vi.fn().mockResolvedValue({
          entities: [
            makeRawApiPromotion({
              id: 'promo-bxgy-no-variants',
              priority: 1,
              customData: {
                product: { attributeGroupId: groupId, attributeId },
              },
              effect: {
                type: 'buy_x_get_y',
                additionalData: {
                  eligibleItemsQuantity: 1,
                  applicableItemSelectionType: 'variant_ids',
                  discountType: 'relative',
                  discountValue: 100,
                },
              },
            }),
            makeRawApiPromotion({
              id: 'promo-bxgy-free',
              priority: 2,
              customData: {
                product: { attributeGroupId: groupId, attributeId },
              },
              effect: {
                type: 'buy_x_get_y',
                additionalData: {
                  eligibleItemsQuantity: 1,
                  applicableItemSelectionType: 'variant_ids',
                  discountType: 'relative',
                  discountValue: 100,
                  variantIds: [42],
                },
              },
            }),
          ],
        })
        const variantsGetByIds = vi.fn().mockResolvedValue([{ productId: 10 }])
        const productsGetByIds = vi.fn().mockResolvedValue([
          {
            id: 10,
            isSoldOut: false,
            isNew: false,
            referenceKey: 'gift-ref',
            attributes: [],
            images: [],
            variants: [],
            priceRange: {
              min: {
                withTax: 0,
                withoutTax: 0,
                currencyCode: 'EUR',
                appliedReductions: [],
              },
              max: {
                withTax: 0,
                withoutTax: 0,
                currencyCode: 'EUR',
                appliedReductions: [],
              },
            },
          },
        ])
        const storefront = createStorefrontWithMocks({
          promotionsGet,
          variantsGetByIds,
          productsGetByIds,
        })
        mockFetchProduct.mockResolvedValue(productWithPromotion)
        const ctx = createMockContext({
          url: 'https://example.com/de/p/correct-slug-42',
          storefront,
        })

        const resolve = await captureGiftPromotionResolver(ctx)
        const result = await resolve()

        expect(result).toMatchObject({
          promotion: { id: 'promo-bxgy-free' },
          products: [{ id: 10 }],
        })
        expect(variantsGetByIds).toHaveBeenCalledWith([42], expect.any(Object))
      })

      it('does not fetch the basket', async () => {
        const basketGet = vi
          .fn()
          .mockRejectedValue(new Error('basket must not be called'))
        const promotionsGet = vi.fn().mockResolvedValue({ entities: [] })
        const storefront = createStorefrontWithMocks({
          promotionsGet,
          basketGet,
        })
        mockFetchProduct.mockResolvedValue(productWithPromotion)
        const ctx = createMockContext({
          url: 'https://example.com/de/p/correct-slug-42',
          storefront,
        })

        const resolve = await captureGiftPromotionResolver(ctx)
        await resolve()

        expect(basketGet).not.toHaveBeenCalled()
      })

      it('resolves to null and logs when fetching promotions rejects', async () => {
        const promotionsGet = vi
          .fn()
          .mockRejectedValue(new Error('SAPI unavailable'))
        const storefront = createStorefrontWithMocks({ promotionsGet })
        mockFetchProduct.mockResolvedValue(productWithPromotion)
        const ctx = createMockContext({
          url: 'https://example.com/de/p/correct-slug-42',
          storefront,
        })

        const resolve = await captureGiftPromotionResolver(ctx)

        // A rejected deferred prop is dropped from the partial-reload response
        // and strands the PDP on its skeleton. The resolver must catch and
        // resolve to null so <Deferred data="giftPromotion"> settles.
        await expect(resolve()).resolves.toBeNull()
        expect(errorLogMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to fetch gift promotion',
          }),
        )
      })
    })
  })

  describe('error handling', () => {
    // `BaseProductDetailController.test.ts` rethrows a plain `Error` only, so
    // this is the one test of a `FetchError` other than a 404.
    it('rethrows when API returns non-404 error', async () => {
      const response = new Response(null, { status: 500 })
      const apiError = new FetchError(response)
      mockFetchProduct.mockRejectedValue(apiError)
      const ctx = createMockContext({ identifier: 'foo-99' })
      await expect(runView(ctx)).rejects.toBe(apiError)
      expect(ctx.notFound).not.toHaveBeenCalled()
    })
  })
})
