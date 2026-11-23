import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { call } from '@orpc/server'
import { SortOrder, SmartSortingKey } from '@scayle/storefront-api'
import type {
  ProductWith,
  SmartSortingKey as SmartSortingKeyType,
} from '@scayle/storefront-api'
import { ATTRIBUTE_KEY_BRAND } from '@shared/constants/attributeKeys'
import type { MapperRegistry, ServiceRegistry } from '@scayle/storefront'
import {
  createMockRequestContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { cmsRouter } from './cms'

const {
  productsQueryMock,
  productsGetByIdsMock,
  getActiveCampaignKeyMock,
  mapProductMock,
  getOrSetMock,
} = vi.hoisted(() => ({
  productsQueryMock: vi.fn(),
  productsGetByIdsMock: vi.fn(),
  getActiveCampaignKeyMock: vi.fn(),
  mapProductMock: vi.fn((product: { id: number }) => ({ id: product.id })),
  getOrSetMock: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
}))

const productListingIncludes: ProductWith = { attributes: 'all' }

const createContext = () =>
  createMockRequestContext({
    storefront: createMockStorefrontContext({
      storefrontAPI: {
        products: {
          query: productsQueryMock,
          getByIds: productsGetByIdsMock,
        },
      } as never,
      cache: { getOrSet: getOrSetMock } as never,
    }),
    mappers: {
      product: {
        mapProduct: mapProductMock,
        Includes: productListingIncludes,
      },
    } as unknown as MapperRegistry,
    services: {
      campaigns: { getActiveCampaignKey: getActiveCampaignKeyMock },
    } as unknown as ServiceRegistry,
  })

describe('cms rpc', () => {
  describe('getProductsByIds', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      getActiveCampaignKeyMock.mockResolvedValue(undefined)
      productsGetByIdsMock.mockResolvedValue([{ id: 1 }, { id: 2 }])
    })

    it('returns mapped products without a campaign key when no campaign is active', async () => {
      const result = await call(
        cmsRouter.getProductsByIds,
        { ids: [1, 2] },
        { context: createContext() },
      )

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      expect(getOrSetMock).toHaveBeenCalledWith(
        'cms:products:by-ids:1%2C2:%:%',
        expect.any(Function),
      )
      expect(productsGetByIdsMock).toHaveBeenCalledWith([1, 2], {
        with: productListingIncludes,
        pricePromotionKey: undefined,
        campaignKey: undefined,
      })
    })

    it('passes the active campaign key to the Storefront API and the cache key', async () => {
      getActiveCampaignKeyMock.mockResolvedValue('summer-sale')

      await call(
        cmsRouter.getProductsByIds,
        { ids: [1, 2], pricePromotionKey: 'vip' },
        { context: createContext() },
      )

      expect(getOrSetMock).toHaveBeenCalledWith(
        'cms:products:by-ids:1%2C2:vip:summer-sale',
        expect.any(Function),
      )
      expect(productsGetByIdsMock).toHaveBeenCalledWith([1, 2], {
        with: productListingIncludes,
        pricePromotionKey: 'vip',
        campaignKey: 'summer-sale',
      })
    })

    it.for([
      { case: 'no ids', ids: [] },
      {
        case: 'more than 100 ids',
        ids: Array.from({ length: 101 }, (_, i) => i),
      },
    ])('rejects a request with $case', async ({ ids }) => {
      await expect(
        call(cmsRouter.getProductsByIds, { ids }, { context: createContext() }),
      ).rejects.toThrow('Input validation failed')

      expect(productsGetByIdsMock).not.toHaveBeenCalled()
    })
  })

  describe('getProductsBySmartSorting', () => {
    // Smart sorting queries carry a TTL-bucketed `sellableAt`, so the clock is
    // frozen mid-bucket to assert both the truncation and the value.
    const SELLABLE_AT = '2026-08-10T14:30:00.000Z'
    const SELLABLE_AT_KEY_SEGMENT = encodeURIComponent(SELLABLE_AT)
    const CACHE_TTL_SECONDS = 5 * 60

    beforeEach(() => {
      vi.clearAllMocks()
      getActiveCampaignKeyMock.mockResolvedValue(undefined)
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-10T14:30:45.123Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns mapped products for a valid smart sorting key', async () => {
      productsQueryMock.mockResolvedValue({
        entities: [{ id: 1 }, { id: 2 }],
        pagination: {},
      })

      const result = await call(
        cmsRouter.getProductsBySmartSorting,
        { smartSortingKey: SmartSortingKey.TOPSELLER, limit: 5 },
        { context: createContext() },
      )

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      expect(getOrSetMock).toHaveBeenCalledWith(
        `cms:products:smart-sort:scayle%3Av1%3Atopseller:%:%:5:%:${SELLABLE_AT_KEY_SEGMENT}:%`,
        expect.any(Function),
        CACHE_TTL_SECONDS,
      )
      expect(productsQueryMock).toHaveBeenCalledWith({
        where: { sellableAt: SELLABLE_AT },
        sort: {
          sortingKey: SmartSortingKey.TOPSELLER,
          direction: SortOrder.DESCENDING,
        },
        with: productListingIncludes,
        pagination: { perPage: 5 },
        pricePromotionKey: undefined,
      })
      expect(mapProductMock).toHaveBeenCalledTimes(2)
    })

    it('passes the active campaign key to the Storefront API and the cache key', async () => {
      getActiveCampaignKeyMock.mockResolvedValue('summer-sale')
      productsQueryMock.mockResolvedValue({
        entities: [],
        pagination: {},
      })

      await call(
        cmsRouter.getProductsBySmartSorting,
        { smartSortingKey: SmartSortingKey.TOPSELLER, limit: 5 },
        { context: createContext() },
      )

      expect(getOrSetMock).toHaveBeenCalledWith(
        `cms:products:smart-sort:scayle%3Av1%3Atopseller:%:%:5:%:${SELLABLE_AT_KEY_SEGMENT}:summer-sale`,
        expect.any(Function),
        CACHE_TTL_SECONDS,
      )
      expect(productsQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({ campaignKey: 'summer-sale' }),
      )
    })

    it('applies category and brand filters in the query where clause', async () => {
      productsQueryMock.mockResolvedValue({
        entities: [],
        pagination: {},
      })

      await call(
        cmsRouter.getProductsBySmartSorting,
        {
          smartSortingKey: SmartSortingKey.TOPSELLER,
          categoryId: 10,
          brandId: 42,
        },
        { context: createContext() },
      )

      expect(getOrSetMock).toHaveBeenCalledWith(
        `cms:products:smart-sort:scayle%3Av1%3Atopseller:10:42:10:%:${SELLABLE_AT_KEY_SEGMENT}:%`,
        expect.any(Function),
        CACHE_TTL_SECONDS,
      )
      expect(productsQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sellableAt: SELLABLE_AT,
            categoryId: 10,
            attributes: [
              {
                type: 'attributes',
                key: ATTRIBUTE_KEY_BRAND,
                values: [42],
              },
            ],
          },
          pagination: { perPage: 10 },
        }),
      )
    })

    it('rejects an invalid smartSortingKey', async () => {
      await expect(
        call(
          cmsRouter.getProductsBySmartSorting,
          { smartSortingKey: 'invalid-key' as SmartSortingKeyType },
          { context: createContext() },
        ),
      ).rejects.toThrow('Input validation failed')

      expect(productsQueryMock).not.toHaveBeenCalled()
      expect(getOrSetMock).not.toHaveBeenCalled()
    })
  })
})
