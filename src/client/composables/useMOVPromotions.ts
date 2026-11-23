import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import type { TieredPromotion } from '@shared/types/Promotion'

import type { CentAmount } from '@scayle/storefront-api'
import { formatCurrency } from '@shared/utils/formatter'
import { usePage } from '@client/composables/usePage'
import type { PromotionTier } from '@scayle/storefront/types'
import type { StorefrontCountry } from '@scayle/storefront/config'
import { useI18n } from 'vue-i18n'
import { useBasket } from './useBasket'

/**
 * Per-tier progress for a minimum-order-value (MOV) promotion.
 * Used by useMOVPromotions and SFPromotionProgressWrapper to show spend progress and tier effects.
 */
interface TierProgress {
  /** The missing basket value (cents) needed to complete the tier. */
  remaining: CentAmount
  /** The minimum total basket value (cents) needed to complete the tier. */
  mov: CentAmount
  /** Progress towards this tier: 0 = 0%, 1 = 100% (tier reached). */
  progress: number
  /** Share of total MOV at which this tier unlocks (for progress bar milestones). */
  percent: number
  /** The discount effect when this tier is unlocked. */
  effect: PromotionTier['effect']
}

interface UseMOVPromotionsReturn {
  /** Normalized progress from 0 (not started) to 1 (tier complete). */
  progress: ComputedRef<number>
  /** Array of tier progress objects with remaining, mov, progress, percent, and effect. */
  tiers: ComputedRef<TierProgress[]>
  /** Remaining amount needed to reach next tier (or 0 if complete). */
  remaining: ComputedRef<CentAmount>
  /** Whether the highest tier of the promotion has been reached. */
  complete: ComputedRef<boolean>
  /** Discount amount applied from the basket, formatted with locale and currency (if promotion is applied). */
  discount: ComputedRef<string | undefined>
  /** Whether this specific promotion is applied to current basket items. */
  isPromotionApplied: ComputedRef<boolean>
  /** Milestone data for progress bar rendering (percent, title, subtitle per tier). */
  milestones: ComputedRef<
    Array<{ percent: number; title: string; subtitle: string }>
  >
}

/**
 * Computes progress and display data for a tiered MOV (minimum order value) promotion.
 * Used in SFPromotionProgressWrapper to show remaining spend, progress bar, milestones, and
 * whether the promotion is applied and at which discount level.
 *
 * @param _promotion Tiered promotion (ref, getter, or plain). Must have tiers with mov and effect.
 * @returns Progress (0–1), tiers with remaining/mov/progress/percent/effect, remaining amount to
 *   next tier, complete flag, discount amount if applied, isPromotionApplied, and milestones for
 *   the progress bar.
 *
 * @example
 * ```ts
 * const { progress, remaining, isPromotionApplied, milestones } = useMOVPromotions(
 *   () => promotion as TieredPromotion
 * )
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/pricing-and-discounts/promotions
 */
export function useMOVPromotions(
  _promotion: MaybeRefOrGetter<TieredPromotion>,
): UseMOVPromotionsReturn {
  const { basket } = useBasket()
  const { props } = usePage()
  const { t } = useI18n()

  const promotion = toValue(_promotion)

  const basketTotal = computed(() => {
    return (basket.value?.cost.totalWithoutPromotionsInCents ?? 0) as CentAmount
  })

  const maxMov = computed(() => {
    if (!promotion.tiers.length) {
      return 0 as CentAmount
    }
    return promotion.tiers.at(-1)!.mov
  })

  /**
   * Share of the highest tier's minimum order value a cent amount represents,
   * or 0 when the promotion has no spend target to divide by. A tiered
   * promotion whose highest tier has a `mov` of 0 passes `SFDealBanner`'s
   * `isTieredPromotion` gate and reaches this composable, and dividing by it
   * would put NaN on the progress bar and on every milestone.
   */
  const shareOfMaxMov = (amount: number) =>
    maxMov.value > 0 ? amount / maxMov.value : 0

  const tiers = computed<TierProgress[]>(() => {
    return promotion.tiers.map((tier) => {
      return {
        remaining: (basketTotal.value >= tier.mov
          ? 0
          : tier.mov - basketTotal.value) as CentAmount,
        progress:
          basketTotal.value >= tier.mov ? 1 : basketTotal.value / tier.mov,
        percent: shareOfMaxMov(tier.mov),
        effect: tier.effect,
        mov: tier.mov,
      }
    })
  })

  const progress = computed<number>(() => {
    return Math.min(Math.max(shareOfMaxMov(basketTotal.value), 0), 1)
  })

  const remaining = computed(
    () =>
      (tiers.value.find((tier) => tier.remaining > 0)?.remaining ??
        0) as CentAmount,
  )

  const complete = computed<boolean>(() => {
    return progress.value >= 1
  })

  const discount = computed(() => {
    return basket.value?.cost.promotionReductionsPerPromotion.find(
      (reduction) => reduction.id === promotion.id,
    )?.total
  })

  const isPromotionApplied = computed<boolean>(() => {
    return (basket.value?.availableItems ?? []).some(({ promotions }) => {
      return promotions.some(
        (basketPromotion) => basketPromotion.id === promotion.id,
      )
    })
  })

  const milestones = computed(() =>
    tiers.value.map((tier) => ({
      percent: tier.percent,
      title: formatCurrency(
        tier.mov,
        props.storefront.country as StorefrontCountry,
        { currencyFractionDigits: 0 },
      ),
      subtitle:
        tier.effect.type === 'automatic_discount'
          ? tier.effect.value
          : t('promotion_progress_wrapper.free_gift'),
    })),
  )

  return {
    progress,
    tiers,
    remaining,
    complete,
    discount,
    isPromotionApplied,
    milestones,
  }
}
