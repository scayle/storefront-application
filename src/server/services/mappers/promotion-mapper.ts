import type { Promotion as StorefrontAPIPromotion } from '@scayle/storefront-api'
import { PromotionMapper } from '@scayle/storefront/mappers'
import type { Promotion, PromotionTier } from '@scayle/storefront/types'

/**
 * Maps raw Storefront API promotion data to the application `Promotion` type.
 *
 * Extends the tenant-invariant base {@link PromotionMapper} (which maps the
 * identity, schedule, tiers, and effect the API returns at the top level) and
 * layers the tenant-specific concerns: the presentational `headline` and the
 * `customData`-derived fields (including the Vue `CSSProperties` color, which
 * stays app-side because `@scayle/storefront` must not depend on Vue).
 *
 * @example
 * ```ts
 * const mapper = new PromotionMapperService(context)
 * const promotion = mapper.mapPromotion(apiPromotion)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class PromotionMapperService extends PromotionMapper {
  /**
   * Maps a Storefront API promotion to the application `Promotion`, reusing the
   * base mapping and adding the presentational `headline` and `customData`-derived
   * fields. Display values fall back to defaults when `customData` is absent.
   *
   * When the Storefront API returns no tiers, synthesizes a single tier from
   * `customData.minimumOrderValue` and the promotion's effect, overriding the
   * base mapper's `tiers` (see {@link mapMinimumOrderValueTier}).
   *
   * @param promotion Raw promotion from the Storefront API.
   * @returns Mapped `Promotion` ready for use in views and components.
   */
  public override mapPromotion(promotion: StorefrontAPIPromotion): Promotion {
    const { customData } = promotion
    const basePromotion = super.mapPromotion(promotion)

    return {
      ...basePromotion,
      tiers: basePromotion.tiers ?? this.mapMinimumOrderValueTier(promotion),
      headline: promotion.displayName || promotion.name,
      subline: customData?.subline,
      link: customData?.link ?? '',
      hideCountdown: customData?.hideCountdown ?? false,
      conditions: customData?.conditions ?? '',
      color: {
        backgroundColor:
          customData?.color?.background ?? 'var(--color-promotion)',
        color: customData?.color?.text ?? 'var(--color-primary)',
      },
      product: customData?.product
        ? {
            attributeId: customData.product.attributeId,
            attributeGroupId: customData.product.attributeGroupId,
            badgeLabel: customData.product.badgeLabel,
          }
        : undefined,
      highlightProductCards: customData?.highlightProductCards ?? false,
    }
  }

  /**
   * Builds the single tier for a promotion configured with a minimum order
   * value instead of API tiers, so the progress bar renders for it like it
   * does for a tiered promotion.
   *
   * @param promotion Raw promotion from the Storefront API.
   * @returns A one-element tier array, or `undefined` when the promotion has no
   * minimum order value or no effect to show once the threshold is reached.
   */
  private mapMinimumOrderValueTier(
    promotion: StorefrontAPIPromotion,
  ): PromotionTier[] | undefined {
    const mov = promotion.customData?.minimumOrderValue

    // Without an effect there is no reward to display at the threshold, so the
    // promotion stays tierless and falls back to the plain-text banner.
    if (!mov || !promotion.effect) {
      return undefined
    }

    // Routed through `mapTiers` rather than built here, so a tenant override
    // of the tier mapping covers the synthetic tier as well as API tiers.
    return this.mapTiers([
      {
        id: 0,
        name: promotion.name,
        mov,
        effect: promotion.effect,
      },
    ])
  }

  /**
   * Maps a Storefront API promotion to the minimal shape used in order/basket
   * summaries: name, headline, color, and id.
   *
   * @param promotion Raw promotion from the Storefront API.
   * @returns The summary subset of the mapped `Promotion`.
   */
  public mapPromotionForSummary(
    promotion: StorefrontAPIPromotion,
  ): Pick<Promotion, 'name' | 'headline' | 'color' | 'id'> {
    const { customData } = promotion

    return {
      name: promotion.name,
      headline: promotion.displayName || promotion.name,
      color: {
        backgroundColor:
          customData?.color?.background ?? 'var(--color-promotion)',
        color: customData?.color?.text ?? 'var(--color-primary)',
      },
      id: promotion.id,
    }
  }
}
