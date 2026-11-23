import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { usePage } from '@client/composables/usePage'
import { useBasket } from '@client/composables/useBasket'
import { getPromotionsForProduct } from '@shared/utils/promotion'
import type { DetailedProduct, Promotion } from '@scayle/storefront/types'

interface UseProductPromotionsReturn {
  /**
   * Promotions applicable to the product (filtered from `page.props.promotions`).
   * `undefined` until the deferred prop resolves, so consumers that report a
   * count can tell "none apply" apart from "not loaded yet".
   */
  promotions: ComputedRef<Promotion[] | undefined>
  /** Whether any applicable promotion has been applied to the product in the basket. */
  hasAppliedPromotion: ComputedRef<boolean>
}

/**
 * Resolves the promotions that apply to a product and exposes reactive applied-state.
 *
 * Reads `page.props.promotions`, a deferred shared prop, so the filtered list is `undefined` on
 * the initial render and fills in once the default deferred group resolves.
 * Applied-state is delegated to `useBasket()`'s `isPromotionAppliedForProduct` and reflects
 * per-item promotion membership; it returns `false` until the basket hydrates (basket is in
 * the deferred `customer-data` group).
 *
 * @param product - The product to scope promotions to (ref, getter, or value)
 * @returns `promotions` (filtered list) and `hasAppliedPromotion` (any-applied flag)
 *
 * @remarks
 * Buy X Get Y promotions are not given a separate "applied" branch here: once a
 * BXGY gift is unlocked, its products are rendered as their own block on the page
 * (`buyXGetYPromotion` deferred prop), and the basket's item-level promotions array
 * reflects normal promotion application — there is nothing extra for this composable to do.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/pricing-and-discounts/promotions
 */
export function useProductPromotions(
  product: MaybeRefOrGetter<DetailedProduct>,
): UseProductPromotionsReturn {
  const page = usePage()
  const { isPromotionAppliedForProduct } = useBasket()

  const promotions = computed<Promotion[] | undefined>(() =>
    page.props.promotions === undefined
      ? undefined
      : getPromotionsForProduct(
          toValue(product).attributeValuesByGroup,
          page.props.promotions,
        ),
  )

  const hasAppliedPromotion = computed(
    () =>
      promotions.value?.some((promotion) =>
        isPromotionAppliedForProduct(promotion, toValue(product).id),
      ) ?? false,
  )

  return { promotions, hasAppliedPromotion }
}
