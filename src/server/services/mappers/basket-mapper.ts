import type {
  BasketResponseData as StorefrontAPIBasket,
  BasketItem as StorefrontAPIBasketItem,
  BasketWith,
  Product as StorefrontAPIProduct,
  Variant as StorefrontAPIVariant,
  CentAmount,
} from '@scayle/storefront-api'
import type { PromotionReduction } from '@shared/types/Basket'
import { BasketMapper } from '@scayle/storefront/mappers'
import type { Basket, BasketItem, Promotion } from '@scayle/storefront/types'
import { formatCurrency } from '@shared/utils/formatter'
import { LOW_STOCK_THRESHOLD } from '@server/constants'
import { isFreeGiftPromotion } from '@shared/utils/promotion'

const getReductionForSpecificPromotion = (
  item: StorefrontAPIBasketItem,
  promotionId: string,
): CentAmount => {
  return item.price.total.appliedReductions.reduce((total, reduction) => {
    if (reduction.promotionId === promotionId) {
      return total + reduction.amount.absoluteWithTax
    }
    return total
  }, 0) as CentAmount
}

/**
 * Application basket mapper. Extends the SDK `BasketMapper` for the
 * tenant-invariant shape (items with their variant and promotions, cost,
 * applied-reduction summary, applied promotion codes) and layers the
 * tenant-specific members on top: each line's size options, the
 * per-promotion reduction summary, and applicable gift promotions.
 * Registered on the `basket` mapper registry slot and resolved per request.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class BasketMapperService extends BasketMapper {
  protected override readonly lowStockThreshold = LOW_STOCK_THRESHOLD

  /**
   * Storefront API `with` selection for basket reads and mutations. Each line's
   * product uses the listing product includes. Its variant list uses the PDP
   * variant includes, which carry stock, so the size selector can label, price
   * and disable every option without a request per line.
   */
  public override get Includes(): BasketWith {
    return {
      items: {
        product: {
          ...this.mappers.product.Includes,
          variants: this.mappers.product.VariantIncludes,
        },
        variant: this.mappers.product.VariantIncludes,
        promotion: true,
      },
      applicablePromotions: true,
    }
  }

  /**
   * Maps a Storefront API basket response to the internal Basket type: the
   * tenant-invariant shape from the SDK base plus applicable gift promotions
   * and the per-promotion reduction summary on the cost.
   *
   * @param apiBasket Raw basket from the Storefront API (with items, cost, applied reductions)
   * @returns Mapped Basket with items, cost, and promotion payloads
   */
  public override mapBasket(apiBasket: StorefrontAPIBasket): Basket {
    const base = super.mapBasket(apiBasket)

    const promotionReductionsPerPromotion = this.summarizePromotionReductions(
      apiBasket.items,
    )

    const promotionReductionSumInCents = promotionReductionsPerPromotion.reduce(
      (total, promotion) => total + promotion.totalInCents,
      0,
    )

    const giftPromotions =
      apiBasket.applicablePromotions
        ?.map(({ promotion }) => this.mappers.promotion.mapPromotion(promotion))
        .filter(isFreeGiftPromotion) ?? []

    return {
      ...base,
      cost: {
        ...base.cost,
        promotionReductionsPerPromotion,
        // Deliberately replaces the base sum: the base reads the basket-level
        // `cost.appliedReductions`, this reads the per-item promotions the
        // summary renders row by row. The two disagree where a promotion is
        // reported on the line items but not on the basket cost, and the
        // rendered rows and their total have to agree.
        promotionReductionSumInCents,
        hasReductions:
          base.cost.hasReductions || promotionReductionsPerPromotion.length > 0,
      },
      giftPromotions,
    }
  }

  /**
   * Maps a Storefront API basket item to the internal BasketItem type: the
   * tenant-invariant shape from the SDK base plus the product's variants as
   * the line's size options.
   *
   * @param apiItem Raw basket item from the API (product, variant, price, quantity)
   * @returns Mapped BasketItem with the size options added
   */
  protected override mapBasketItem(
    apiItem: StorefrontAPIBasketItem<
      StorefrontAPIProduct,
      StorefrontAPIVariant
    >,
  ): BasketItem {
    return {
      ...super.mapBasketItem(apiItem),
      // The size selector offers these; `Includes` requests them with the same
      // selection the purchased variant uses, so they arrive with the basket.
      variants: (apiItem.product.variants ?? []).map((variant) =>
        this.mappers.product.mapVariant(variant),
      ),
    }
  }

  private summarizePromotionReductions(
    items: StorefrontAPIBasketItem[],
  ): PromotionReduction[] {
    const promotionReductionsPerPromotion = new Map<
      string,
      Pick<Promotion, 'name' | 'headline' | 'color' | 'id'> & { total: number }
    >()
    for (const item of items) {
      if (!item.promotions || item.promotions.length === 0) {
        continue
      }

      for (const promotion of item.promotions) {
        const total = getReductionForSpecificPromotion(item, promotion.id)
        if (total <= 0) {
          continue
        }
        const promotionForSummary =
          this.mappers.promotion.mapPromotionForSummary(promotion)

        const existingPromotion = promotionReductionsPerPromotion.get(
          promotion.id,
        )
        if (existingPromotion) {
          existingPromotion.total += total
        } else {
          promotionReductionsPerPromotion.set(promotion.id, {
            total,
            ...promotionForSummary,
          })
        }
      }
    }
    return Array.from(
      promotionReductionsPerPromotion.values(),
      ({ total, color, name, headline, id }) => {
        const absTotal = Math.abs(total)
        return {
          total: formatCurrency(absTotal, this.context.country),
          totalInCents: absTotal,
          color,
          name,
          headline,
          id,
        }
      },
    )
  }
}
