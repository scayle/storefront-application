import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { Basket } from '@scayle/storefront/types'
import { createMockBasket } from '@test/mock-data/basket'
import SFBasketSummaryPromotions from './SFBasketSummaryPromotions.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      storefront: {
        country: { locale: 'en-US', currency: { currencyCode: 'USD' } },
      },
    },
  }),
}))

describe('SFBasketSummaryPromotions.vue', () => {
  const promotionReduction = {
    name: 'Promo A',
    headline: 'Promo A',
    color: { backgroundColor: '#111', color: '#fff' },
    id: '1',
    total: '$1.00',
    totalInCents: 100,
  }

  const createBasket = (cost: Partial<Basket['cost']> = {}): Basket => {
    const basket = createMockBasket()
    return { ...basket, cost: { ...basket.cost, ...cost } }
  }

  const mountSummary = (basket: Basket) =>
    mount(SFBasketSummaryPromotions, {
      props: { basket },
      global: {
        mocks: { $t: (key: string) => key },
        stubs: {
          SFBasketSummaryPromotionsDiscounts: {
            template: '<div data-testid="discounts" />',
          },
          SFFadeInTransition: { template: '<div><slot /></div>' },
        },
      },
    })

  it('renders the promotion and campaign total as a signed deduction in the shop currency', () => {
    const basket = createBasket({
      promotionReductionsPerPromotion: [promotionReduction],
      promotionReductionSumInCents: 100,
      campaignReductionSumInCents: 200,
      hasCampaignReduction: true,
      hasReductions: true,
    })

    const wrapper = mountSummary(basket)

    expect(
      wrapper.get('[data-testid="summary-total-promotion-reduction"]').text(),
    ).toBe('-$3.00')
  })

  it('omits the total row when promotion and campaign reductions are both zero', () => {
    const basket = createBasket({
      promotionReductionSumInCents: 0,
      campaignReductionSumInCents: 0,
    })

    const wrapper = mountSummary(basket)

    expect(
      wrapper
        .find('[data-testid="summary-total-promotion-reduction"]')
        .exists(),
    ).toBe(false)
  })

  it('expands the discounts when the toggle is clicked', async () => {
    const basket = createBasket()

    const wrapper = mountSummary(basket)
    const toggle = wrapper.get(
      '[data-testid="promotion-summary-toggle-button"]',
    )

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="discounts"]').exists()).toBe(false)

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="discounts"]').exists()).toBe(true)
  })
})
