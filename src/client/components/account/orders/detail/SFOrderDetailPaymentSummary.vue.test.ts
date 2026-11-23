import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { OrderCost } from '@scayle/storefront/types'
import { defaultCost } from '@test/mock-data/orders'
import { t } from '@test/mocks/vue-i18n'
import SFOrderDetailPaymentSummary from './SFOrderDetailPaymentSummary.vue'

const mountSummary = (cost: OrderCost) =>
  mount(SFOrderDetailPaymentSummary, {
    props: { cost },
    global: { mocks: { $t: t } },
  })

describe('SFOrderDetailPaymentSummary', () => {
  it('renders the subtotal, shipping cost and total in their own rows', () => {
    const wrapper = mountSummary({
      ...defaultCost,
      subtotal: '€45.00',
      shippingCost: '€4.95',
      finalPrice: '€49.95',
    })

    expect({
      subtotal: wrapper.get('[data-testid="order-detail-subtotal"]').text(),
      shippingCost: wrapper
        .get('[data-testid="order-detail-shipping-cost"]')
        .text(),
      total: wrapper.get('[data-testid="order-detail-total"]').text(),
    }).toEqual({
      subtotal: '€45.00',
      shippingCost: '€4.95',
      total: '€49.95',
    })
  })

  it('shows the excluding VAT label when tax is not included', () => {
    const wrapper = mountSummary({ ...defaultCost, includesTax: false })

    expect(wrapper.text()).toContain('global.excluding_vat')
    expect(wrapper.text()).not.toContain('global.including_vat')
  })

  it('shows the including VAT label when tax is included', () => {
    const wrapper = mountSummary({ ...defaultCost, includesTax: true })

    expect(wrapper.text()).toContain('global.including_vat')
    expect(wrapper.text()).not.toContain('global.excluding_vat')
  })

  it('renders other fees in their own row when the order has them', () => {
    const wrapper = mountSummary({
      ...defaultCost,
      subtotal: '€43.00',
      otherFees: '€2.00',
    })

    expect(wrapper.text()).toContain(
      'account.order_detail.payment_summary.other_fees',
    )
    expect(wrapper.get('[data-testid="order-detail-other-fees"]').text()).toBe(
      '€2.00',
    )
  })

  it('omits the other fees row when the order has no other fees', () => {
    const wrapper = mountSummary(defaultCost)

    expect(
      wrapper.find('[data-testid="order-detail-other-fees"]').exists(),
    ).toBe(false)
  })
})
