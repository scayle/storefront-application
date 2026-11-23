import { describe, expect, it } from 'vitest'
import type { CentAmount } from '@scayle/storefront-api'
import type {
  AppliedReduction,
  BasketItem,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import { createMockBasket, createMockBasketItem } from '@test/mock-data/basket'
import { createMockListingProduct } from '@test/mock-data/products'
import {
  createMockPromotion,
  createMockTieredPromotion,
} from '@test/mock-data/promotions'
import {
  getPromotionsForProduct,
  getPromotionIdsMatchingBasketProducts,
  getPromotionReductionLabel,
  isFreeGiftPromotion,
  isPromotionApplied,
} from './promotion'

describe('getPromotionsForProduct', () => {
  it('returns empty array when promotions is empty or undefined', () => {
    expect(getPromotionsForProduct({ '1': [10] })).toEqual([])
    expect(getPromotionsForProduct({ '1': [10] }, [])).toEqual([])
  })

  it('returns promotions that match product attribute values', () => {
    const promo = createMockPromotion({
      product: { attributeGroupId: 1, attributeId: 10 },
    })
    const attributeValuesByGroup = { '1': [10, 20] }
    expect(getPromotionsForProduct(attributeValuesByGroup, [promo])).toEqual([
      promo,
    ])
  })

  it('filters out promotions that do not match product attribute values', () => {
    const promo = createMockPromotion({
      product: { attributeGroupId: 1, attributeId: 99 },
    })
    const attributeValuesByGroup = { '1': [10, 20] }
    expect(getPromotionsForProduct(attributeValuesByGroup, [promo])).toEqual([])
  })
})

function createItemWithReductions(
  appliedReductions: AppliedReduction[],
): BasketItem {
  const item = createMockBasketItem()
  return { ...item, totalPrice: { ...item.totalPrice, appliedReductions } }
}

describe('getPromotionIdsMatchingBasketProducts', () => {
  it('includes promotion IDs when any basket item matches the product filter', () => {
    const promotion = createMockPromotion({
      id: 'promo-a',
      product: { attributeGroupId: 1, attributeId: 10 },
    })
    const promotions = [promotion]
    const item = createMockBasketItem({
      product: createMockListingProduct({
        attributeValuesByGroup: { '1': [10] },
      }),
    })
    expect(getPromotionIdsMatchingBasketProducts(promotions, [item])).toEqual(
      new Set(['promo-a']),
    )
  })

  it('returns an empty set when no basket item matches any promotion product filter', () => {
    const promotion = createMockPromotion({
      id: 'promo-a',
      product: { attributeGroupId: 1, attributeId: 99 },
    })
    const item = createMockBasketItem({
      product: createMockListingProduct({
        attributeValuesByGroup: { '1': [10] },
      }),
    })
    expect(
      getPromotionIdsMatchingBasketProducts([promotion], [item]).size,
    ).toBe(0)
  })
})

describe('isPromotionApplied', () => {
  it('returns false when there are no line items', () => {
    const promotion = createMockPromotion({ id: 'mov-1' })
    const basket = createMockBasket({ availableItems: [] })
    expect(isPromotionApplied(promotion, basket)).toBe(false)
  })

  it('returns true for tiered promotion when appliedReductions match', () => {
    const promotion = createMockTieredPromotion({ id: 'tier-1' })
    const basket = createMockBasket({
      availableItems: [
        createItemWithReductions([
          {
            category: 'promotion',
            type: 'absolute',
            amount: '€1.00',
            amountInCents: 100,
            promotionId: 'tier-1',
          },
        ]),
      ],
    })
    expect(isPromotionApplied(promotion, basket)).toBe(true)
  })

  // A MOV-only promotion carries a synthetic tier so the progress bar renders,
  // which also moves it onto the appliedReductions branch here. Its reduction
  // is what marks it applied, not an entry in `item.promotions`.
  it('returns true for a MOV-only promotion applied through its synthetic tier', () => {
    const promotion = createMockTieredPromotion({
      id: 'mov-1',
      tiers: [
        {
          id: 0,
          name: 'Test',
          mov: 5000 as CentAmount,
          effect: {
            type: 'automatic_discount',
            discountType: 'absolute',
            value: '€5.00',
          },
        },
      ],
    })
    const basket = createMockBasket({
      availableItems: [
        createItemWithReductions([
          {
            category: 'promotion',
            type: 'absolute',
            amount: '€5.00',
            amountInCents: 500,
            promotionId: 'mov-1',
          },
        ]),
      ],
    })
    expect(isPromotionApplied(promotion, basket)).toBe(true)
  })

  it.for([
    {
      carriedBy: 'the only item',
      items: [
        createMockBasketItem({
          promotions: [createMockPromotion({ id: 'code-1' })],
        }),
      ],
      expected: true,
    },
    {
      carriedBy: 'one of two items',
      items: [
        createMockBasketItem({
          promotions: [createMockPromotion({ id: 'code-1' })],
        }),
        createMockBasketItem({ key: 'item-2' }),
      ],
      expected: true,
    },
    {
      carriedBy: 'no item',
      items: [
        createMockBasketItem({
          promotions: [createMockPromotion({ id: 'other' })],
        }),
        createMockBasketItem({ key: 'item-2' }),
      ],
      expected: false,
    },
  ])(
    'returns $expected for a non-tier promotion carried by $carriedBy',
    ({ items, expected }) => {
      const basket = createMockBasket({ availableItems: items })
      expect(
        isPromotionApplied(createMockPromotion({ id: 'code-1' }), basket),
      ).toBe(expected)
    },
  )

  it('returns false for tiered promotion when no promotion reduction carries its id', () => {
    const promotion = createMockTieredPromotion({ id: 'tier-1' })
    const item = createItemWithReductions([
      // The mapped type gives a sale reduction no promotion id. This one
      // has it, so only the category check keeps it from matching.
      {
        category: 'sale',
        type: 'absolute',
        amount: '€1.00',
        amountInCents: 100,
        promotionId: 'tier-1',
      } as AppliedReduction,
      {
        category: 'promotion',
        type: 'absolute',
        amount: '€1.00',
        amountInCents: 100,
        promotionId: 'other',
      },
    ])
    const basket = createMockBasket({ availableItems: [item] })
    expect(isPromotionApplied(promotion, basket)).toBe(false)
  })
})

describe('isFreeGiftPromotion', () => {
  const buyXGetYEffect = (variantIds?: number[], isFree = true) =>
    ({
      type: 'buy_x_get_y',
      eligibleItemsQuantity: 1,
      applicableItemSelectionType: 'variant_ids',
      discountType: 'relative',
      value: '100',
      isFree,
      variantIds,
    }) as Promotion['effect']

  it.for<{ name: string; effect: Promotion['effect']; expected: boolean }>([
    {
      name: 'a free buy_x_get_y effect with gift variant ids',
      effect: buyXGetYEffect([42]),
      expected: true,
    },
    {
      name: 'a non-free buy_x_get_y effect with gift variant ids',
      effect: buyXGetYEffect([42], false),
      expected: true,
    },
    {
      name: 'a buy_x_get_y effect with an empty gift variant id list',
      effect: buyXGetYEffect([]),
      expected: false,
    },
    {
      name: 'a buy_x_get_y effect without gift variant ids',
      effect: buyXGetYEffect(),
      expected: false,
    },
    {
      name: 'a non-buy_x_get_y effect',
      effect: {
        type: 'automatic_discount',
        discountType: 'relative',
        value: '100',
        isFree: true,
      } as Promotion['effect'],
      expected: false,
    },
    { name: 'no effect', effect: undefined, expected: false },
  ])('returns $expected for $name', ({ effect, expected }) => {
    expect(isFreeGiftPromotion(createMockPromotion({ effect }))).toBe(expected)
  })
})

describe('getPromotionReductionLabel', () => {
  const promotionWith = (
    effect: Promotion<BuyXGetYEffect>['effect'],
  ): Promotion<BuyXGetYEffect> => ({ ...createMockPromotion(), effect })

  const effect = (over: { isFree?: boolean; value?: string }) =>
    ({
      type: 'buy_x_get_y',
      eligibleItemsQuantity: 1,
      applicableItemSelectionType: 'variant_ids',
      discountType: 'relative',
      value: '-50%',
      isFree: false,
      variantIds: [42],
      ...over,
    }) as Promotion<BuyXGetYEffect>['effect']

  const t = (key: string) => (key === 'promotion.free_label' ? 'Free' : key)

  it('returns the free label when the effect grants the item for free', () => {
    expect(
      getPromotionReductionLabel(promotionWith(effect({ isFree: true })), t),
    ).toBe('Free')
  })

  it('returns the formatted effect value when the effect is not free', () => {
    expect(
      getPromotionReductionLabel(
        promotionWith(effect({ isFree: false, value: '-50%' })),
        t,
      ),
    ).toBe('-50%')
  })

  it('returns undefined when the promotion has no effect', () => {
    expect(
      getPromotionReductionLabel(promotionWith(undefined), t),
    ).toBeUndefined()
  })
})
