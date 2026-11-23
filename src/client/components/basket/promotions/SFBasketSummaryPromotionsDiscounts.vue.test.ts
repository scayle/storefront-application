import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { PromotionReduction } from '@shared/types/Basket'
import { createMockCampaign } from '@test/mock-data/promotions'
import SFBasketSummaryPromotionsDiscounts from './SFBasketSummaryPromotionsDiscounts.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      storefront: {
        country: { locale: 'en-US', currency: { currencyCode: 'USD' } },
      },
    },
  }),
}))

describe('SFBasketSummaryPromotionsDiscounts.vue', () => {
  const reductions: PromotionReduction[] = [
    {
      id: '1',
      name: 'internal-promo-1',
      headline: 'Promo One Headline',
      color: { backgroundColor: '#222', color: '#fff' },
      total: '$2.00',
      totalInCents: 200,
    },
  ]

  it('renders promotion rows from promotionReductionsSumPerPromotion', () => {
    const wrapper = mount(SFBasketSummaryPromotionsDiscounts, {
      props: {
        promotionReductionsSumPerPromotion: reductions,
        campaignReductionSumInCents: 0,
      },
    })

    const items = wrapper.findAll(
      '[data-testid="basket-summary-promotion-item"]',
    )
    expect(items).toHaveLength(1)
    expect(
      wrapper.find('[data-testid="basket-discount-promotion"]').text(),
    ).toContain('-$2.00')
  })

  it('renders the promotion headline rather than the internal name', () => {
    const wrapper = mount(SFBasketSummaryPromotionsDiscounts, {
      props: {
        promotionReductionsSumPerPromotion: reductions,
        campaignReductionSumInCents: 0,
      },
    })

    const item = wrapper.find('[data-testid="basket-summary-promotion-item"]')
    expect(item.text()).toContain('Promo One Headline')
    expect(item.text()).not.toContain('internal-promo-1')
  })

  it('renders campaign row when campaign and campaignReductionSumInCents are set', () => {
    const wrapper = mount(SFBasketSummaryPromotionsDiscounts, {
      props: {
        promotionReductionsSumPerPromotion: [],
        campaignReductionSumInCents: 300,
        campaign: createMockCampaign(),
      },
    })

    expect(
      wrapper.find('[data-testid="basket-discount-campaign"]').text(),
    ).toContain('-$3.00')
  })

  it.for([
    {
      case: 'a campaign without a campaign reduction',
      campaign: createMockCampaign(),
      campaignReductionSumInCents: 0,
    },
    {
      case: 'a campaign reduction without a campaign',
      campaign: null,
      campaignReductionSumInCents: 300,
    },
  ])(
    'renders no campaign row for $case',
    ({ campaign, campaignReductionSumInCents }) => {
      const wrapper = mount(SFBasketSummaryPromotionsDiscounts, {
        props: {
          promotionReductionsSumPerPromotion: [],
          campaignReductionSumInCents,
          campaign,
        },
      })

      expect(
        wrapper.find('[data-testid="basket-discount-campaign"]').exists(),
      ).toBe(false)
    },
  )
})
