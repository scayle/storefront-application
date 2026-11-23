import type {
  BuyXGetYEffect,
  ProductVariant,
  Promotion,
} from '@scayle/storefront/types'

export interface PromotionReduction extends Pick<
  Promotion,
  'name' | 'headline' | 'color' | 'id'
> {
  /** Promotion total formatted with locale and currency (always positive). */
  total: string
  /** Promotion total in cents (always positive). Populated by the server mapper. */
  totalInCents: number
}

/**
 * Tenant-specific members of the base basket types. The base shapes ship with
 * `@scayle/storefront`; the fields below are produced by the application's
 * `BasketMapperService` overrides (size options, promotion summary, gift
 * promotions).
 */
declare module '@scayle/storefront/types' {
  interface BasketItem {
    /**
     * Every variant of this line's product, in Storefront API order — the
     * options `SFBasketVariantSelector` offers, which the Storefront
     * Application renders as a size picker. Carries the same shape as the PDP
     * picker's variants, so both render from one component.
     *
     * Empty when the product has no variants.
     */
    variants: ProductVariant[]
  }

  interface BasketCost {
    /** Promotion reductions per promotion */
    promotionReductionsPerPromotion: PromotionReduction[]
  }

  interface Basket {
    /**
     * Gift-granting Buy X Get Y promotions (the gift can be free or discounted)
     * that this basket unlocks and that still have a gift to choose. Filtered
     * from the API basket's `applicablePromotions` with `isFreeGiftPromotion`.
     * The Storefront API currently drops a promotion from that list once the
     * gift is in the basket and lists it again when another gift is earned. The
     * API reference does not document this. Carries no gift products. The
     * client reads the ids through `useBasket().isGiftPromotionApplicable` (gift
     * panel and promotion banner), and `BasketController` passes each entry to
     * `GiftService.fetchGifts` to build the rendered gift rows (`GiftPromotion`
     * with `products`).
     */
    giftPromotions: Promotion<BuyXGetYEffect>[]
  }
}
