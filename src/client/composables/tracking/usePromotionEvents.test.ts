import { describe, expect, it, vi } from 'vitest'
import type { Campaign, Promotion } from '@scayle/storefront/types'
import type { PromotionPlacement } from '@client/utils/promotion'
import { usePromotionEvents } from './usePromotionEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  track: vi.fn(),
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('./useAnalytics', () => ({
  useAnalytics: () => ({ track: mocks.track }),
}))

const promotion: Promotion = {
  id: 'promo-1',
  name: 'Summer Sale',
  headline: 'Up to 30% off',
  subline: 'Limited time',
  link: '/promotions/summer',
  priority: 1,
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#000000', color: '#ffffff' },
  schedule: { from: '2026-06-01', to: '2026-08-31' },
}

const campaign: Campaign = {
  id: 'camp-9',
  key: 'summer-campaign',
  name: 'Summer Campaign',
  reduction: 20,
  schedule: { from: '2026-06-01', to: '2026-08-31' },
  headline: 'Summer Sale',
  subline: 'Up to 20%',
  link: '/campaigns/summer',
  hideCountdown: false,
  color: { backgroundColor: '#000000', color: '#ffffff' },
  conditions: '',
}

const placement: PromotionPlacement = {
  component_type: 'pdp_banner',
  position: 2,
  total: 3,
}

describe('usePromotionEvents', () => {
  it.for([
    {
      name: 'trackViewPromotion reports a promotion view on both pipelines',
      fire: (events: ReturnType<typeof usePromotionEvents>) =>
        events.trackViewPromotion(promotion, placement),
      ga4: {
        event: 'view_promotion',
        promotion_id: 'promo-1',
        promotion_name: 'Summer Sale',
      },
      analytics: {
        promotion_id: 'promo-1',
        promotion_type: 'promotion',
        component_type: 'pdp_banner',
        position: 2,
        total: 3,
      },
    },
    {
      name: 'trackSelectPromotion reports a promotion click on both pipelines',
      fire: (events: ReturnType<typeof usePromotionEvents>) =>
        events.trackSelectPromotion(promotion, placement),
      ga4: {
        event: 'select_promotion',
        promotion_id: 'promo-1',
        promotion_name: 'Summer Sale',
      },
      analytics: {
        promotion_id: 'promo-1',
        promotion_type: 'promotion',
        component_type: 'pdp_banner',
        position: 2,
        total: 3,
      },
    },
    {
      name: 'trackViewCampaign reports a campaign view on both pipelines',
      fire: (events: ReturnType<typeof usePromotionEvents>) =>
        events.trackViewCampaign(campaign, {
          component_type: 'ribbon',
          position: 1,
          total: 1,
        }),
      ga4: {
        event: 'view_promotion',
        promotion_id: 'camp-9',
        promotion_name: 'Summer Campaign',
      },
      analytics: {
        promotion_id: 'camp-9',
        promotion_type: 'campaign',
        component_type: 'ribbon',
        position: 1,
        total: 1,
      },
    },
    {
      name: 'trackSelectCampaign reports a campaign click on both pipelines',
      fire: (events: ReturnType<typeof usePromotionEvents>) =>
        events.trackSelectCampaign(campaign, placement),
      ga4: {
        event: 'select_promotion',
        promotion_id: 'camp-9',
        promotion_name: 'Summer Campaign',
      },
      analytics: {
        promotion_id: 'camp-9',
        promotion_type: 'campaign',
        component_type: 'pdp_banner',
        position: 2,
        total: 3,
      },
    },
  ] as const)('$name', ({ fire, ga4, analytics }) => {
    fire(usePromotionEvents())

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith(ga4)
    expect(mocks.track).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith(ga4.event, analytics)
  })
})
