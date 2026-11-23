import { z } from 'zod'
import type { ListingProduct } from '@scayle/storefront/types'
import type {
  ProductSearchQuery,
  RFC3339Date,
  SmartSortingKey as SmartSortingKeyType,
} from '@scayle/storefront-api'
import { SortOrder, SmartSortingKey } from '@scayle/storefront-api'
import {
  buildCacheKey,
  buildRpc,
  createCacheFriendlyTimestamp,
  defineRpc,
} from '@scayle/storefront'
import { ATTRIBUTE_KEY_BRAND } from '@shared/constants/attributeKeys'
import { base } from './base'

/** Matches `CacheService.DEFAULT_TTL_SECONDS` — bucket and TTL stay aligned. */
const SMART_SORTING_CACHE_TTL_SECONDS = 5 * 60

const smartSortingKeySchema = z.enum(
  Object.values(SmartSortingKey) as [
    SmartSortingKeyType,
    ...SmartSortingKeyType[],
  ],
)

const getProductsByIdsInput = z.object({
  ids: z.array(z.number().int()).min(1).max(100),
  pricePromotionKey: z.string().optional(),
})
const getProductsByIdsOutput = z.custom<ListingProduct[]>()

const getProductsBySmartSortingInput = z.object({
  smartSortingKey: smartSortingKeySchema,
  categoryId: z.number().int().optional(),
  brandId: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  pricePromotionKey: z.string().optional(),
})
const getProductsBySmartSortingOutput = z.custom<ListingProduct[]>()

function buildSmartSortingWhere(options: {
  sellableAt: RFC3339Date
  categoryId?: number
  brandId?: number
}): ProductSearchQuery {
  const { sellableAt, categoryId, brandId } = options
  const where: ProductSearchQuery = { sellableAt }

  if (categoryId !== undefined) {
    where.categoryId = categoryId
  }

  if (brandId !== undefined) {
    where.attributes = [
      {
        type: 'attributes',
        key: ATTRIBUTE_KEY_BRAND,
        values: [brandId],
      },
    ]
  }

  return where
}

/**
 * Resolves product data for displaying Products in cms components
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/rpc-api
 */
export const getProductsByIdsDefinition = defineRpc({
  route: {
    method: 'GET',
    summary: 'Get products by IDs',
    description: 'Gets products by IDs',
  },
  input: getProductsByIdsInput,
  output: getProductsByIdsOutput,
  errors: {},
  handler: async ({ context, input }) => {
    const campaignKey = await context.services.campaigns.getActiveCampaignKey()

    return context.storefront.cache.getOrSet(
      buildCacheKey(
        'cms',
        'products',
        'by-ids',
        input.ids.join(','),
        input.pricePromotionKey,
        campaignKey,
      ),
      async () => {
        const products =
          await context.storefront.storefrontAPI.products.getByIds(input.ids, {
            with: context.mappers.product.Includes,
            pricePromotionKey: input.pricePromotionKey,
            campaignKey,
          })

        return products.map((product) =>
          context.mappers.product.mapProduct(product),
        )
      },
    )
  },
})

/**
 * Resolves product data for CMS smart sorting product sliders.
 */
export const getProductsBySmartSortingDefinition = defineRpc({
  route: {
    method: 'GET',
    summary: 'Get products by smart sorting',
    description: 'Gets products sorted by a smart sorting key for CMS sliders',
  },
  input: getProductsBySmartSortingInput,
  output: getProductsBySmartSortingOutput,
  errors: {},
  handler: async ({ context, input }) => {
    const sellableAt = createCacheFriendlyTimestamp(
      SMART_SORTING_CACHE_TTL_SECONDS,
    )
    const campaignKey = await context.services.campaigns.getActiveCampaignKey()

    return context.storefront.cache.getOrSet(
      buildCacheKey(
        'cms',
        'products',
        'smart-sort',
        input.smartSortingKey,
        input.categoryId,
        input.brandId,
        input.limit,
        input.pricePromotionKey,
        sellableAt,
        campaignKey,
      ),
      async () => {
        const response = await context.storefront.storefrontAPI.products.query({
          where: buildSmartSortingWhere({
            sellableAt,
            categoryId: input.categoryId,
            brandId: input.brandId,
          }),
          sort: {
            sortingKey: input.smartSortingKey,
            direction: SortOrder.DESCENDING,
          },
          with: context.mappers.product.Includes,
          pagination: { perPage: input.limit },
          pricePromotionKey: input.pricePromotionKey,
          campaignKey,
        })

        return response.entities.map((product) =>
          context.mappers.product.mapProduct(product),
        )
      },
      SMART_SORTING_CACHE_TTL_SECONDS,
    )
  },
})

export const cmsRouter = {
  getProductsByIds: buildRpc(base, getProductsByIdsDefinition),
  getProductsBySmartSorting: buildRpc(
    base,
    getProductsBySmartSortingDefinition,
  ),
}
