import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockVariantPrice } from '@test/mock-data/products'
import {
  createMockCampaign,
  createMockPromotion,
} from '@test/mock-data/promotions'
import SFProductDealBanners from './SFProductDealBanners.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const stubs = {
  SFDealBanner: {
    props: ['deal', 'showTextBox', 'placement'],
    template:
      '<div data-testid="deal-banner" :data-deal-id="deal.id" :data-component-type="placement?.component_type" :data-position="placement?.position" :data-total="placement?.total" />',
  },
}

describe('SFProductDealBanners.vue', () => {
  it('renders nothing when no campaign and no promotions', () => {
    const wrapper = mount(SFProductDealBanners, {
      props: {
        promotions: [],
        campaign: null,
        price: createMockVariantPrice({ hasCampaignReduction: false }),
      },
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="deal-banner"]').exists()).toBe(false)
  })

  it('renders the campaign banner when price has a campaign reduction', () => {
    const wrapper = mount(SFProductDealBanners, {
      props: {
        promotions: [],
        campaign: createMockCampaign({ id: 'c-1' }),
        price: createMockVariantPrice({ hasCampaignReduction: true }),
      },
      global: { stubs },
    })

    const banners = wrapper.findAll('[data-testid="deal-banner"]')
    expect(banners).toHaveLength(1)
    expect(banners[0]!.attributes('data-deal-id')).toBe('c-1')
  })

  it('renders one banner per promotion', () => {
    const a = createMockPromotion({ id: 'a' })
    const b = createMockPromotion({ id: 'b' })

    const wrapper = mount(SFProductDealBanners, {
      props: {
        promotions: [a, b],
        campaign: null,
        price: createMockVariantPrice({ hasCampaignReduction: false }),
      },
      global: { stubs },
    })

    const banners = wrapper.findAll('[data-testid="deal-banner"]')
    expect(banners).toHaveLength(2)
    expect(banners[0]!.attributes('data-deal-id')).toBe('a')
    expect(banners[1]!.attributes('data-deal-id')).toBe('b')
  })

  it('places every banner as a pdp_banner with its position among all deals', () => {
    const wrapper = mount(SFProductDealBanners, {
      props: {
        promotions: [
          createMockPromotion({ id: 'a' }),
          createMockPromotion({ id: 'b' }),
        ],
        campaign: createMockCampaign(),
        price: createMockVariantPrice({ hasCampaignReduction: true }),
      },
      global: { stubs },
    })

    const placements = wrapper
      .findAll('[data-testid="deal-banner"]')
      .map((banner) => [
        banner.attributes('data-component-type'),
        banner.attributes('data-position'),
        banner.attributes('data-total'),
      ])
    expect(placements).toEqual([
      ['pdp_banner', '1', '3'],
      ['pdp_banner', '2', '3'],
      ['pdp_banner', '3', '3'],
    ])
  })

  it('does not count a campaign without a reduction in the deal set', () => {
    const wrapper = mount(SFProductDealBanners, {
      props: {
        promotions: [createMockPromotion({ id: 'a' })],
        campaign: createMockCampaign(),
        price: createMockVariantPrice({ hasCampaignReduction: false }),
      },
      global: { stubs },
    })

    const banners = wrapper.findAll('[data-testid="deal-banner"]')
    expect(banners).toHaveLength(1)
    expect(banners[0]!.attributes('data-position')).toBe('1')
    expect(banners[0]!.attributes('data-total')).toBe('1')
  })

  it('reports no placement while the deferred promotions have not resolved', () => {
    const wrapper = mount(SFProductDealBanners, {
      props: {
        promotions: undefined,
        campaign: createMockCampaign(),
        price: createMockVariantPrice({ hasCampaignReduction: true }),
      },
      global: { stubs },
    })

    const banners = wrapper.findAll('[data-testid="deal-banner"]')
    expect(banners).toHaveLength(1)
    expect(banners[0]!.attributes('data-total')).toBeUndefined()
  })
})
