import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SFOrderSuccessPaymentSummary from './SFOrderSuccessPaymentSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const tMock = (key: string) => key

const globalConfig = {
  mocks: { $t: tMock },
}

const cost = {
  finalPrice: '$100.00',
  finalPriceInCents: 10000,
  subtotal: '$90.00',
  currency: 'USD',
  shippingCost: '$10.00',
  shippingCostInCents: 1000,
  taxInCents: 0,
  saleReductionSumInCents: 0,
  campaignReductionSumInCents: 0,
  promotionReductionSumInCents: 0,
  includesTax: true,
}

describe('SFOrderSuccessPaymentSummary', () => {
  it('renders the subtotal, shipping cost, and total', () => {
    const wrapper = mount(SFOrderSuccessPaymentSummary, {
      props: { cost },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="success-subtotal"]').text()).toBe(
      '$90.00',
    )
    expect(wrapper.get('[data-testid="success-shipping-cost"]').text()).toBe(
      '$10.00',
    )
    expect(wrapper.get('[data-testid="success-total"]').text()).toBe('$100.00')
  })

  it('shows the including VAT label when tax is included', () => {
    const wrapper = mount(SFOrderSuccessPaymentSummary, {
      props: { cost },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="success-vat-label"]').text()).toBe(
      'global.including_vat',
    )
  })

  it('shows the excluding VAT label when tax is not included', () => {
    const wrapper = mount(SFOrderSuccessPaymentSummary, {
      props: { cost: { ...cost, includesTax: false } },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="success-vat-label"]').text()).toBe(
      'global.excluding_vat',
    )
  })

  it('renders other fees in their own row when the order has them', () => {
    const wrapper = mount(SFOrderSuccessPaymentSummary, {
      props: { cost: { ...cost, subtotal: '$88.00', otherFees: '$2.00' } },
      global: globalConfig,
    })

    expect(wrapper.text()).toContain(
      'order_information.payment_summary.other_fees',
    )
    expect(wrapper.get('[data-testid="success-other-fees"]').text()).toBe(
      '$2.00',
    )
  })

  it('omits the other fees row when the order has no other fees', () => {
    const wrapper = mount(SFOrderSuccessPaymentSummary, {
      props: { cost },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="success-other-fees"]').exists()).toBe(
      false,
    )
  })
})
