import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import type { Basket, Promotion } from '@scayle/storefront/types'
import { usePage } from '@client/composables/usePage'
import { isTieredPromotion } from '@client/utils/promotion'
import {
  getPromotionIdsMatchingBasketProducts,
  isPromotionApplied,
} from '@shared/utils/promotion'

interface UseBasketPromotionBannersReturn {
  /**
   * Tiered and combo deal promotions that concern the current basket, in the
   * order of `page.props.promotions`. `undefined` until
   * both deferred inputs have hydrated, so the page can tell "no banners" apart
   * from "not loaded yet".
   */
  banners: ComputedRef<Promotion[] | undefined>
}

/**
 * Derives the promotion banners shown above the basket lines.
 *
 * Reads the shared `promotions` prop (deferred, default group, fetched with
 * the customer's access token so customer-scoped promotions are included) and
 * the basket the caller already holds from `useBasket()`. A promotion is a
 * banner when it is a tiered or combo deal promotion and is either already
 * applied to a basket line or targets a product attribute carried by an
 * available basket item. Minimum-order-value promotions are covered by the
 * tier the promotion mapper synthesizes for them.
 *
 * The basket is a parameter rather than a second `useBasket()` call so the
 * page controls which basket instance the banners follow.
 *
 * `promotions` and `basket` are independent deferred props that can hydrate
 * in either order. Gate the page on `banners`, not on `basket` alone, or a
 * page that renders as soon as `basket` resolves can still see `banners` as
 * `undefined` for a moment.
 *
 * `banners` recomputes whenever `basket` changes, so `promotions` never
 * needs to sit in a `useBasket([...])` reload list. Only keys the server
 * must re-fetch after a mutation belong there.
 *
 * @param basket The basket from the caller's `useBasket()`, `undefined` while
 *   the deferred prop has not hydrated, `null` when the fetch failed
 * @returns `banners`, the eligible promotions, or `undefined` while the
 *   promotions prop has not hydrated or the basket is `undefined`/`null`
 *
 * @example
 * ```vue
 * const { basket } = useBasket()
 * const { banners } = useBasketPromotionBanners(basket)
 * // <SFDealBanner v-for="promotion in banners" :key="promotion.id" :deal="promotion" />
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/pricing-and-discounts/promotions
 */
export function useBasketPromotionBanners(
  basket: MaybeRefOrGetter<Basket | null | undefined>,
): UseBasketPromotionBannersReturn {
  const page = usePage()

  const banners = computed<Promotion[] | undefined>(() => {
    const promotions = page.props.promotions
    const currentBasket = toValue(basket)
    if (promotions === undefined || !currentBasket) {
      return undefined
    }

    const promotionIdsMatchingBasketProducts =
      getPromotionIdsMatchingBasketProducts(
        promotions,
        currentBasket.availableItems,
      )

    return promotions.filter((promotion) => {
      const isComboDeal = promotion.effect?.type === 'combo_deal'
      return (
        (isTieredPromotion(promotion) || isComboDeal) &&
        (isPromotionApplied(promotion, currentBasket) ||
          promotionIdsMatchingBasketProducts.has(promotion.id))
      )
    })
  })

  return { banners }
}
