import { describe, it, expect, vi } from 'vitest'
import type {
  AppliedReduction,
  BasketWith,
  CentAmount,
  Product as StorefrontAPIProduct,
  Variant as StorefrontAPIVariant,
} from '@scayle/storefront-api'
import { BasketMapper } from '@scayle/storefront/mappers'
import {
  createApiBasket,
  createApiBasketItem,
  createApiBasketItemPromotion,
  createApiProduct,
  createApiPromotion,
  createApiVariant,
} from '@scayle/storefront/test'
import { LOW_STOCK_THRESHOLD } from '@server/constants'
import { ATTRIBUTE_KEY_SIZE } from '@shared/constants/attributeKeys'
import {
  createMockListingProduct,
  createMockProductVariant,
} from '../../../test/mock-data/products'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { BasketMapperService } from './basket-mapper'
import { PromotionMapperService } from './promotion-mapper'

// The SDK `BasketMapper` is abstract over its `Includes`, so the base mapping
// is read through a subclass that only supplies an empty selection.
class BaseBasketMapper extends BasketMapper {
  public override get Includes(): BasketWith {
    return {}
  }
}

const variantIncludes = {
  attributes: { withKey: [ATTRIBUTE_KEY_SIZE] },
  stock: {},
}

// The promotions an item lists and the reductions it carries are separate
// fields in the Storefront API, so a test can list a promotion without a
// reduction for it.
function createItemWithPromotionReductions(
  key: string,
  promotionIds: string[],
  reductionInCentsByPromotionId: Record<string, number>,
) {
  const { price } = createApiBasketItem()
  return createApiBasketItem({
    key,
    promotions: promotionIds.map((id) => createApiBasketItemPromotion({ id })),
    price: {
      ...price,
      total: {
        ...price.total,
        appliedReductions: Object.entries(reductionInCentsByPromotionId).map(
          ([promotionId, amount]): AppliedReduction => ({
            category: 'promotion',
            type: 'absolute',
            amount: { absoluteWithTax: amount as CentAmount, relative: 0 },
            promotionId,
          }),
        ),
      },
    },
  })
}

describe('BasketMapperService', () => {
  const context = createMockStorefrontContext({
    country: { currency: { currencyCode: 'USD' }, locale: 'en' },
  })
  const mappers = createMockMapperRegistry(context, {
    product: {
      mapProduct: vi.fn((product: StorefrontAPIProduct) =>
        createMockListingProduct({ id: product.id }),
      ),
      mapVariant: vi.fn((variant: StorefrontAPIVariant) =>
        createMockProductVariant({ id: variant.id }),
      ),
      Includes: { priceRange: true },
      VariantIncludes: variantIncludes,
    },
    promotion: new PromotionMapperService(context),
  })
  const service = new BasketMapperService(context, mappers)

  describe('mapBasket', () => {
    it('keeps the base mapping of the basket and its cost', () => {
      const apiBasket = createApiBasket({
        cost: {
          ...createApiBasket().cost,
          withTax: 3000 as CentAmount,
          appliedReductions: [
            {
              category: 'sale',
              type: 'absolute',
              amount: { absoluteWithTax: 300 as CentAmount, relative: 0 },
            },
            {
              category: 'campaign',
              type: 'absolute',
              amount: { absoluteWithTax: 200 as CentAmount, relative: 0 },
            },
          ],
        },
      })

      expect(service.mapBasket(apiBasket)).toMatchObject(
        new BaseBasketMapper(context, mappers).mapBasket(apiBasket),
      )
    })

    it('maps the product variants to the item size options', () => {
      const variants = [
        createApiVariant({
          id: 11,
          stock: { ...createApiVariant().stock, quantity: 4 },
        }),
        createApiVariant({
          id: 12,
          stock: { ...createApiVariant().stock, quantity: 0 },
        }),
      ]
      const apiItem = createApiBasketItem({
        key: 'item-1',
        product: createApiProduct({ id: 42, variants }),
        variant: variants[0],
      })

      const result = service.mapBasket(createApiBasket({ items: [apiItem] }))

      expect(result.availableItems[0]!.variants?.map(({ id }) => id)).toEqual([
        11, 12,
      ])
    })

    it('maps size options to an empty list when the product carries no variants', () => {
      const apiItem = createApiBasketItem({
        key: 'item-1',
        product: createApiProduct({ id: 42, variants: undefined }),
      })

      const result = service.mapBasket(createApiBasket({ items: [apiItem] }))

      expect(result.availableItems[0]!.variants).toEqual([])
    })

    it('flags an item as low on stock up to the shop low-stock threshold', () => {
      const apiBasket = createApiBasket({
        items: [
          createApiBasketItem({
            key: 'at-threshold',
            availableQuantity: LOW_STOCK_THRESHOLD,
          }),
          createApiBasketItem({
            key: 'above-threshold',
            availableQuantity: LOW_STOCK_THRESHOLD + 1,
          }),
        ],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.availableItems.map(({ isLowStock }) => isLowStock)).toEqual(
        [true, false],
      )
    })

    it('surfaces the promotion display headline in promotionReductionsPerPromotion', () => {
      const apiBasket = createApiBasket({
        items: [
          createItemWithPromotionReductions('item-1', ['promo-1'], {
            'promo-1': 500,
          }),
        ],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.cost.promotionReductionsPerPromotion).toMatchObject([
        { name: 'Summer Sale', headline: 'Summer Sale Display' },
      ])
      // Summed from the per-item promotions, not from the basket cost.
      expect(result.cost.promotionReductionSumInCents).toBe(500)
      expect(result.cost.hasReductions).toBe(true)
    })

    it('reports a zero promotion sum for a basket without item promotions', () => {
      const apiBasket = createApiBasket({
        items: [createApiBasketItem({ key: 'item-1' })],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.cost.promotionReductionsPerPromotion).toEqual([])
      expect(result.cost.promotionReductionSumInCents).toBe(0)
    })

    it('takes the per-item promotion sum over the basket-level one when they disagree', () => {
      const apiBasket = createApiBasket({
        items: [
          createItemWithPromotionReductions('item-1', ['promo-1'], {
            'promo-1': 500,
          }),
        ],
        cost: {
          ...createApiBasket().cost,
          appliedReductions: [
            {
              category: 'promotion',
              type: 'absolute',
              amount: { absoluteWithTax: 300 as CentAmount, relative: 0 },
              promotionId: 'promo-1',
            },
          ],
        },
      })

      const result = service.mapBasket(apiBasket)

      // The base mapper would report 300 from the basket-level reductions.
      expect(result.cost.promotionReductionSumInCents).toBe(500)
    })

    it('sums a promotion that applies to several items into one summary row', () => {
      const apiBasket = createApiBasket({
        items: [
          createItemWithPromotionReductions('item-1', ['promo-1'], {
            'promo-1': 500,
          }),
          createItemWithPromotionReductions('item-2', ['promo-1'], {
            'promo-1': 300,
          }),
        ],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.cost.promotionReductionsPerPromotion).toMatchObject([
        { id: 'promo-1', total: '$8.00', totalInCents: 800 },
      ])
    })

    it('attributes each reduction on an item to its own promotion', () => {
      const apiBasket = createApiBasket({
        items: [
          createItemWithPromotionReductions('item-1', ['promo-1', 'promo-2'], {
            'promo-1': 500,
            'promo-2': 200,
          }),
        ],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.cost.promotionReductionsPerPromotion).toMatchObject([
        { id: 'promo-1', totalInCents: 500 },
        { id: 'promo-2', totalInCents: 200 },
      ])
    })

    it('leaves out a promotion the item lists but carries no reduction for', () => {
      const apiBasket = createApiBasket({
        items: [
          createItemWithPromotionReductions('item-1', ['promo-1', 'promo-2'], {
            'promo-1': 500,
          }),
        ],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.cost.promotionReductionsPerPromotion).toMatchObject([
        { id: 'promo-1' },
      ])
    })

    it('leaves out a promotion whose item reduction the Storefront API reports as negative', () => {
      const apiBasket = createApiBasket({
        items: [
          createItemWithPromotionReductions('item-1', ['promo-1'], {
            'promo-1': -500,
          }),
        ],
      })

      const result = service.mapBasket(apiBasket)

      // Pins today's behavior, not a decision: the basket-level sums take the
      // magnitude of a negative reduction, while this summary drops the row.
      expect(result.cost.promotionReductionsPerPromotion).toEqual([])
      expect(result.cost.promotionReductionSumInCents).toBe(0)
    })
  })

  describe('Includes', () => {
    it('requests the line products with their variants, the purchased variant, the line promotions and the applicable promotions', () => {
      expect(service.Includes).toEqual({
        items: {
          product: { priceRange: true, variants: variantIncludes },
          variant: variantIncludes,
          promotion: true,
        },
        applicablePromotions: true,
      })
    })
  })

  describe('giftPromotions', () => {
    it('keeps only the free gift promotions among the applicable promotions', () => {
      const apiBasket = createApiBasket({
        applicablePromotions: [
          {
            promotion: createApiPromotion({
              id: 'gift-1',
              effect: {
                type: 'buy_x_get_y',
                additionalData: {
                  eligibleItemsQuantity: 1,
                  variantIds: [99],
                  applicableItemSelectionType: 'variant_ids',
                  discountType: 'relative',
                  discountValue: 100,
                  discountDistribution: 'none',
                  maxCount: 1,
                  maxCountType: 'single_item',
                },
              },
            }),
          },
          { promotion: createApiPromotion({ id: 'auto-1' }) },
        ],
      })

      const result = service.mapBasket(apiBasket)

      expect(result.giftPromotions.map(({ id }) => id)).toEqual(['gift-1'])
    })

    it('emits an empty array when applicablePromotions is absent', () => {
      const apiBasket = createApiBasket({ applicablePromotions: undefined })

      expect(service.mapBasket(apiBasket).giftPromotions).toEqual([])
    })
  })
})
