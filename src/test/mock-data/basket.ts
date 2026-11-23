import type { Basket, BasketItem } from '@scayle/storefront/types'
import {
  createMockListingProduct,
  createMockProductVariant,
  createMockVariantPrice,
} from './products'

/**
 * Creates a mock available `BasketItem`: two units of a €10.00 variant.
 *
 * The default quantity is 2, so `totalPrice` (€20.00) differs from `unitPrice`
 * (€10.00) and a test fails when code reads one where it means the other. A test
 * that overrides `quantity` or `unitPrice` and asserts on a price overrides
 * `totalPrice` too, since `totalPrice`, `variant.price` and `product.price` keep
 * their defaults. The four prices are separate objects, so a test that mutates
 * one leaves the others as they were.
 *
 * @param overrides Basket item fields merged over the defaults.
 * @returns A complete basket item. Unless `variants` is overridden, a copy of its
 * `variant`, default or overridden, is the only entry in `variants`: the mapper
 * builds the two separately, so code that matches them by identity fails here as
 * it would in production.
 */
export function createMockBasketItem(
  overrides: Partial<BasketItem> = {},
): BasketItem {
  const variant = overrides.variant ?? createMockProductVariant()
  return {
    key: 'item-1',
    quantity: 2,
    availableQuantity: 10,
    isLowStock: false,
    status: 'available',
    unitPrice: createMockVariantPrice(),
    totalPrice: {
      ...createMockVariantPrice(),
      finalPrice: '€20.00',
      originalPrice: '€20.00',
      finalPriceInCents: 2000,
      originalPriceInCents: 2000,
      appliedReductions: [],
    },
    product: createMockListingProduct({
      price: { ...createMockVariantPrice(), hasDifferentPrices: false },
    }),
    variant,
    variants: [structuredClone(variant)],
    promotions: [],
    customData: {},
    ...overrides,
  }
}

/**
 * Creates a mock `Basket` holding one {@link createMockBasketItem}.
 *
 * `itemCount` sums the quantities of `availableItems` and `unavailableItems` the
 * way the basket mapper does, counting an item group through its main item only,
 * unless the override sets it. `cost` matches the default item, so a test that
 * changes the items and asserts on a total overrides `cost`.
 *
 * @param overrides Basket fields merged over the defaults.
 * @returns A complete basket.
 */
export function createMockBasket(overrides: Partial<Basket> = {}): Basket {
  const { availableItems = [createMockBasketItem()], unavailableItems = [] } =
    overrides
  return {
    availableItems,
    unavailableItems,
    // Mirrors the protected `BasketMapper.countItems` in `@scayle/storefront`
    // (`src/basket/mappers/basketMapper.ts`), so a rule change there must be
    // mirrored here.
    itemCount: [...availableItems, ...unavailableItems].reduce(
      (count, item) =>
        item.itemGroup?.id && !item.itemGroup.isMainItem
          ? count
          : count + item.quantity,
      0,
    ),
    cost: {
      finalPrice: '€20.00',
      finalPriceInCents: 2000,
      // €20.00 net of 19% VAT
      finalPriceWithoutTaxInCents: 1681,
      subtotal: '€20.00',
      totalWithoutPromotionsInCents: 2000,
      saleAndVoucherReductions: [],
      saleReductionSumInCents: 0,
      campaignReductionSumInCents: 0,
      promotionReductionSumInCents: 0,
      hasCampaignReduction: false,
      hasReductions: false,
      currency: 'EUR',
      promotionReductionsPerPromotion: [],
    },
    promotionCodes: [],
    giftPromotions: [],
    ...overrides,
  }
}
