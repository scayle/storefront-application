import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  createMockCampaign,
  createMockPromotion,
} from '@test/mock-data/promotions'
import SFPromotionSlideIn from './SFPromotionSlideIn.vue'

const stubs = {
  SFSlideIn: { template: '<div><slot /></div>' },
  SFDealBanner: {
    props: ['deal', 'placement'],
    template:
      '<div data-testid="deal-banner" :data-deal-id="deal.id" :data-component-type="placement?.component_type" :data-position="placement?.position" :data-total="placement?.total" />',
  },
}

const mocks = { $t: (key: string) => key }

function readPlacements(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('[data-testid="deal-banner"]')
    .map((banner) => [
      banner.attributes('data-component-type'),
      banner.attributes('data-position'),
      banner.attributes('data-total'),
    ])
}

describe('SFPromotionSlideIn.vue', () => {
  it('shows the empty state when there are no deals', () => {
    const wrapper = mount(SFPromotionSlideIn, {
      props: { promotions: [], campaign: null, open: true },
      global: { stubs, mocks },
    })

    expect(wrapper.text()).toContain('promotion_slide_in.no_active_subline')
    expect(wrapper.find('[data-testid="deal-banner"]').exists()).toBe(false)
  })

  it('places the campaign card first and the promotion cards after it', () => {
    const wrapper = mount(SFPromotionSlideIn, {
      props: {
        promotions: [
          createMockPromotion({ id: 'a' }),
          createMockPromotion({ id: 'b' }),
        ],
        campaign: createMockCampaign(),
        open: true,
      },
      global: { stubs, mocks },
    })

    expect(wrapper.find('[data-testid="campaign-card"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="promotion-card"]')).toHaveLength(2)
    expect(readPlacements(wrapper)).toEqual([
      ['deals_overview_banner', '1', '3'],
      ['deals_overview_banner', '2', '3'],
      ['deals_overview_banner', '3', '3'],
    ])
  })

  it('counts only the promotions when there is no campaign', () => {
    const wrapper = mount(SFPromotionSlideIn, {
      props: {
        promotions: [
          createMockPromotion({ id: 'a' }),
          createMockPromotion({ id: 'b' }),
        ],
        campaign: null,
        open: true,
      },
      global: { stubs, mocks },
    })

    expect(wrapper.find('[data-testid="campaign-card"]').exists()).toBe(false)
    expect(readPlacements(wrapper)).toEqual([
      ['deals_overview_banner', '1', '2'],
      ['deals_overview_banner', '2', '2'],
    ])
  })
})
