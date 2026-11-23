import type { Campaign, Promotion } from '@scayle/storefront/types'
import type {
  AnalyticsPromotionComponentType,
  AnalyticsPromotionProperties,
} from '@scayle/storefront-api'
import type { TieredPromotion } from '@shared/types/Promotion'

/**
 * Checks whether a deal is a promotion with at least one tier.
 * Used by `SFDealBanner` to decide whether to render the spend progress bar,
 * which only makes sense for a tiered minimum-order-value promotion.
 *
 * @param deal The promotion or campaign a deal component displays
 * @returns `true` for a promotion that has one or more tiers, `false` for a
 * campaign or a promotion without tiers
 */
export function isTieredPromotion(
  deal: Promotion | Campaign,
): deal is TieredPromotion {
  return 'tiers' in deal && (deal.tiers?.length ?? 0) > 0
}

/**
 * Where a deal component sits, for the SCAYLE Analytics promotion events.
 *
 * The surface rendering the deal declares its `component_type` and the deal's
 * 1-based `position` within the `total` deals shown on that surface, for
 * example the third of four banners in the deals overview. The single layout
 * ribbon reports `1` of `1`.
 */
export type PromotionPlacement = Pick<
  AnalyticsPromotionProperties,
  'component_type' | 'position' | 'total'
>

/**
 * Builds the tracking placement for one deal in a surface's deal set.
 *
 * Owns the campaign-offset rule for every surface that renders a campaign
 * banner above a promotion list (the PDP, the basket page and the deals
 * overview): a shown campaign banner is the first deal of the set and shifts
 * the promotion banners by one.
 *
 * @param componentType Surface the deal set renders on.
 * @param promotions Promotions rendered on the surface, or `undefined` while a
 *   deferred prop holding them has not resolved.
 * @param hasCampaign Whether the campaign banner is shown alongside them.
 * @param deal `'campaign'` for the campaign banner, or the 0-based index of a
 *   promotion within `promotions`.
 * @returns The placement, or `undefined` while `promotions` is unresolved and
 *   the set size is therefore unknown. Callers hold the impression rather than
 *   report a total that the next render contradicts.
 *
 * @example
 * ```vue
 * <SFDealBanner
 *   v-for="(promotion, index) in promotions"
 *   :key="promotion.id"
 *   :deal="promotion"
 *   :placement="getDealPlacement('pdp_banner', promotions, showCampaign, index)"
 * />
 * ```
 */
export function getDealPlacement(
  componentType: AnalyticsPromotionComponentType,
  promotions: Promotion[] | undefined,
  hasCampaign: boolean,
  deal: number | 'campaign',
): PromotionPlacement | undefined {
  if (!promotions) {
    return undefined
  }

  const campaignOffset = hasCampaign ? 1 : 0

  return {
    component_type: componentType,
    position: deal === 'campaign' ? 1 : campaignOffset + deal + 1,
    total: campaignOffset + promotions.length,
  }
}
