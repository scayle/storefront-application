import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { Basket } from '@scayle/storefront/types'
import { createMockBasket } from '@test/mock-data/basket'
import { SFButtonStub } from '@test/stubs/common'
import { routes } from '@shared/routes'

import SFBasketSummary from './SFBasketSummary.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const createBasket = (cost: Partial<Basket['cost']> = {}): Basket => {
  const basket = createMockBasket()
  return { ...basket, cost: { ...basket.cost, ...cost } }
}

const mountSummary = (basket: Basket = createBasket()) =>
  mount(SFBasketSummary, {
    global: {
      stubs: {
        SFButton: SFButtonStub,
        SFBasketSummaryReductions: {
          template: '<div data-testid="basket-summary-reductions" />',
        },
        SFBasketPromotionCodes: true,
        SFExpressCheckoutBasket: true,
      },
    },
    props: {
      basket,
      deliveryCosts: {
        value: 'from €4.99',
        disclaimer: '* Delivery fees will be determined during checkout',
      },
      accessToken: 'test-access-token',
      checkoutJwt: 'test-checkout-jwt',
      campaign: null,
    },
  })

describe('SFBasketSummary', () => {
  it('shows each cost of the basket in its own row', () => {
    const wrapper = mountSummary(
      createBasket({ subtotal: '€25.00', finalPrice: '€20.00' }),
    )

    expect(wrapper.get('[data-testid="basket-summary-subtotal"]').text()).toBe(
      '€25.00',
    )
    expect(wrapper.get('[data-testid="basket-summary-delivery"]').text()).toBe(
      'from €4.99',
    )
    expect(wrapper.get('[data-testid="basket-final-price"]').text()).toBe(
      '€20.00',
    )
    expect(
      wrapper.get('[data-testid="basket-summary-delivery-disclaimer"]').text(),
    ).toBe('* Delivery fees will be determined during checkout')
  })

  it.for([
    {
      case: 'a VAT amount',
      tax: { amount: '€1.90', amountInCents: 190, rate: '19%' },
      label: 'global.including_vat',
    },
    {
      case: 'a VAT amount of zero',
      tax: { amount: '€0.00', amountInCents: 0, rate: '0%' },
      label: 'global.excluding_vat',
    },
    { case: 'no VAT', tax: undefined, label: 'global.excluding_vat' },
  ])('labels the final price $label for $case', ({ tax, label }) => {
    const wrapper = mountSummary(createBasket({ tax }))

    expect(wrapper.get('[data-testid="basket-vat-label"]').text()).toBe(label)
  })

  it.for([
    { case: 'with reductions', hasReductions: true },
    { case: 'without reductions', hasReductions: false },
  ])(
    'shows the reductions section only for a basket $case',
    ({ hasReductions }) => {
      const wrapper = mountSummary(createBasket({ hasReductions }))

      expect(
        wrapper.find('[data-testid="basket-summary-reductions"]').exists(),
      ).toBe(hasReductions)
    },
  )

  it('links the checkout CTA to the checkout', () => {
    const checkoutLink = mountSummary().get('[data-testid="checkout-link"]')

    expect(checkoutLink.attributes('href')).toBe(routes.checkout)
    expect(checkoutLink.text()).toBe('basket.go_to_checkout')
  })
})
