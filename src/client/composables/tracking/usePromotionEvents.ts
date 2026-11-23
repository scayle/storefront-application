import type { Campaign, Promotion } from '@scayle/storefront/types'
import type { AnalyticsPromotionProperties } from '@scayle/storefront-api'
import { TrackingEventNames } from '@shared/types/Tracking'
import type { PromotionPlacement } from '@client/utils/promotion'
import {
  mapCampaignToTrackingItem,
  mapPromotionToTrackingItem,
} from '@client/utils/tracking'
import type { PromotionTrackingFields } from '@client/utils/tracking'
import { useTracking } from './useTracking'
import { useAnalytics } from './useAnalytics'

interface UsePromotionEventsReturn {
  /**
   * Tracks a `view_promotion` event for a single promotion.
   *
   * Callers fire this once per promotion impression, typically when an
   * `SFDealBanner` enters the viewport.
   *
   * @param promotion The promotion that became visible.
   * @param placement Component type and position of the deal within its set.
   */
  trackViewPromotion: (
    promotion: Promotion,
    placement: PromotionPlacement,
  ) => void
  /**
   * Tracks a `select_promotion` event for a single promotion.
   *
   * Callers fire this synchronously on the promotion link click, before
   * navigation runs, so the event is queued on the dataLayer ahead of the
   * Inertia visit.
   *
   * @param promotion The promotion that was clicked.
   * @param placement Component type and position of the deal within its set.
   */
  trackSelectPromotion: (
    promotion: Promotion,
    placement: PromotionPlacement,
  ) => void
  /**
   * Tracks a `view_promotion` event for a campaign.
   *
   * Campaigns share the `view_promotion` event name with promotions in V2,
   * mapped onto the same `promotion_*` fields. Use this from the layout
   * ribbon and the deals flyout where a campaign banner can render alongside
   * or instead of a promotion banner.
   *
   * @param campaign The campaign that became visible.
   * @param placement Component type and position of the deal within its set.
   */
  trackViewCampaign: (campaign: Campaign, placement: PromotionPlacement) => void
  /**
   * Tracks a `select_promotion` event for a campaign.
   *
   * @param campaign The campaign that was clicked.
   * @param placement Component type and position of the deal within its set.
   */
  trackSelectCampaign: (
    campaign: Campaign,
    placement: PromotionPlacement,
  ) => void
}

/**
 * Tracks promotion-related GA4 ecommerce events and their SCAYLE Analytics
 * counterparts.
 *
 * Exposes four helpers that fire the GA4 event and its SCAYLE Analytics
 * counterpart for promotion impressions and clicks: `trackViewPromotion`,
 * `trackSelectPromotion` and the campaign counterparts `trackViewCampaign`,
 * `trackSelectCampaign`. The four helpers exist because V3 surfaces
 * (`SFDealBanner`, `SFDealRibbon`) accept either a `Promotion` or a `Campaign`
 * and the payload shape differs.
 *
 * GA4 events carry `promotion_id` and `promotion_name` at the top level and
 * emit no `ecommerce` block. Each helper also fires the SCAYLE Analytics
 * `view_promotion` or `select_promotion` with the deal id, whether it is a
 * `promotion` or a `campaign`, and the caller's `PromotionPlacement`. All
 * helpers no-op when the tracking plugins are not installed (server, tests):
 * `useTracking().push` and `useAnalytics().track` each log an error and
 * return early, so the helpers do not add a separate guard.
 *
 * @returns Functions for tracking promotion events.
 *
 * @example
 * ```ts
 * const { trackViewPromotion, trackSelectPromotion } = usePromotionEvents()
 *
 * const placement = { component_type: 'pdp_banner', position: 1, total: 2 }
 * trackViewPromotion(promotion, placement)
 * trackSelectPromotion(promotion, placement)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function usePromotionEvents(): UsePromotionEventsReturn {
  const { push } = useTracking()
  const { track } = useAnalytics()

  const buildPromotionPayload = (fields: PromotionTrackingFields) => ({
    event: TrackingEventNames.ViewPromotion,
    ...fields,
  })

  // The SCAYLE Analytics payload is the same for promotions and campaigns.
  // Only the GA4 mapper differs between the four helpers.
  const trackDeal = (
    event: 'view_promotion' | 'select_promotion',
    deal: Promotion | Campaign,
    promotion_type: AnalyticsPromotionProperties['promotion_type'],
    placement: PromotionPlacement,
  ) => track(event, { promotion_id: deal.id, promotion_type, ...placement })

  const trackViewPromotion: UsePromotionEventsReturn['trackViewPromotion'] = (
    promotion,
    placement,
  ) => {
    push(buildPromotionPayload(mapPromotionToTrackingItem(promotion)))
    trackDeal('view_promotion', promotion, 'promotion', placement)
  }

  const trackSelectPromotion: UsePromotionEventsReturn['trackSelectPromotion'] =
    (promotion, placement) => {
      push({
        event: TrackingEventNames.SelectPromotion,
        ...mapPromotionToTrackingItem(promotion),
      })
      trackDeal('select_promotion', promotion, 'promotion', placement)
    }

  const trackViewCampaign: UsePromotionEventsReturn['trackViewCampaign'] = (
    campaign,
    placement,
  ) => {
    push(buildPromotionPayload(mapCampaignToTrackingItem(campaign)))
    trackDeal('view_promotion', campaign, 'campaign', placement)
  }

  const trackSelectCampaign: UsePromotionEventsReturn['trackSelectCampaign'] = (
    campaign,
    placement,
  ) => {
    push({
      event: TrackingEventNames.SelectPromotion,
      ...mapCampaignToTrackingItem(campaign),
    })
    trackDeal('select_promotion', campaign, 'campaign', placement)
  }

  return {
    trackViewPromotion,
    trackSelectPromotion,
    trackViewCampaign,
    trackSelectCampaign,
  }
}
