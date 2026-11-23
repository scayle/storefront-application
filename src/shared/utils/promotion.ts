import type {
  Basket,
  BasketItem,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'

/**
 * Resolves which promotions apply to a product using the attribute lookup shape.
 * Product carries attributeValuesByGroup (groupId -> value ids); promotions carry
 * product.attributeGroupId and product.attributeId. Used on PDP and PLP for badges and deals.
 *
 * Defensive runtime guard on `attributeValuesByGroup`: although the type is
 * non-nullable, callers can still pass `undefined` from non-TypeScript paths
 * (deserialized JSON, tenant fork that loosens the contract). Bail out
 * cleanly instead of throwing on the property access.
 *
 * @param attributeValuesByGroup Product's attribute value ids by group id (from server).
 * @param promotions Full list of promotions (e.g. from shared data or API).
 * @returns Promotions that apply to this product, in original order; empty if missing input.
 */
export function getPromotionsForProduct(
  attributeValuesByGroup: Record<string, number[]>,
  promotions?: Promotion[],
): Promotion[] {
  if (!attributeValuesByGroup || !promotions?.length) {
    return []
  }
  return promotions.filter(
    (promotion) =>
      promotion.product &&
      attributeValuesByGroup[
        String(promotion.product.attributeGroupId)
      ]?.includes(promotion.product.attributeId),
  )
}

/**
 * Collects promotion IDs whose product rule matches at least one basket line item.
 * Single pass over items and promotions: O(basket items × promotions). Prefer this over
 * per-promotion checks when processing multiple promotions at once (e.g. basket page).
 *
 * @param promotions Full active promotion list
 * @param basketItems Available basket items (each `product.attributeValuesByGroup` is evaluated)
 * @returns Set of promotion IDs with a matching product attribute on any line item
 */
export function getPromotionIdsMatchingBasketProducts(
  promotions: Promotion[],
  basketItems: BasketItem[],
): Set<string> {
  const ids = new Set<string>()
  if (!promotions.length || !basketItems.length) {
    return ids
  }

  for (const item of basketItems) {
    const attributeValuesByGroup = item.product.attributeValuesByGroup

    if (!attributeValuesByGroup) {
      continue
    }

    for (const promotion of promotions) {
      if (!promotion.product) {
        continue
      }

      if (
        attributeValuesByGroup[
          String(promotion.product.attributeGroupId)
        ]?.includes(promotion.product.attributeId)
      ) {
        ids.add(promotion.id)
      }
    }
  }

  return ids
}

/**
 * Whether the promotion is reflected on a line (tier reductions or item-level promotion list).
 *
 * @param promotion - The promotion to check
 * @param basket - The basket to check
 * @returns True when the promotion is reflected on a line
 */
export function isPromotionApplied(
  promotion: Promotion,
  basket: Basket,
): boolean {
  const basketItems = basket.availableItems
  if (!basketItems?.length) {
    return false
  }
  return basketItems.some((item) => {
    if (promotion.tiers?.length) {
      return item.totalPrice.appliedReductions.some(
        (reduction) =>
          reduction.category === 'promotion' &&
          reduction.promotionId === promotion.id,
      )
    }
    return item.promotions.some((p) => p.id === promotion.id)
  })
}

/**
 * Narrows a promotion to a gift-granting Buy X Get Y promotion.
 * True when the mapped effect is `buy_x_get_y` and declares the gift variant IDs
 * that `GiftService.fetchGifts` needs to resolve the gift products.
 * Used to pick gift promotions from a mixed promotion list on the PDP and in the basket mapper.
 *
 * @param promotion The mapped promotion to check
 * @returns True when the promotion is a Buy X Get Y promotion with gift variant IDs
 */
export const isFreeGiftPromotion = (
  promotion: Promotion,
): promotion is Promotion<BuyXGetYEffect> => {
  return (
    promotion.effect?.type === 'buy_x_get_y' &&
    (promotion.effect?.variantIds?.length ?? 0) > 0
  )
}

/**
 * Resolves the discount label for a Buy X Get Y (gift) promotion: the localized
 * "free" label when the effect grants the item for free, otherwise the effect's
 * pre-formatted value (e.g. `-50%`). Single source shared by the reduction badge
 * and the variant picker's per-option reduction, so both render the same value
 * and neither has to know the "free" translation key.
 *
 * @param promotion The mapped Buy X Get Y promotion.
 * @param t Translate function (e.g. from `useI18n()`); used only for the free label.
 * @returns The reduction label, or `undefined` when the effect carries no value.
 */
export function getPromotionReductionLabel(
  promotion: Promotion<BuyXGetYEffect>,
  t: (key: string) => string,
): string | undefined {
  return promotion.effect?.isFree
    ? t('promotion.free_label')
    : promotion.effect?.value
}
