import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockOrder } from '@test/mock-data/orders'
import SFOrderSuccessBasicDataSection from './SFOrderSuccessBasicDataSection.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
}

// The greeting box is not stubbed, so the test reads the greeting a user sees.
const stubs = {
  SFOrderSuccessOrderData: true,
  SFOrderSuccessPaymentData: true,
  SFOrderSuccessAddressInfo: true,
  SFOrderSuccessCtaButtons: true,
}

describe('SFOrderSuccessBasicDataSection', () => {
  it('renders the title and every detail block for an order with payment', () => {
    const order = createMockOrder()
    const wrapper = mount(SFOrderSuccessBasicDataSection, {
      props: { order },
      global: { ...globalConfig, stubs },
    })

    expect(wrapper.get('h1').text()).toBe('order_success_page.title')
    expect(
      wrapper.get('[data-testid="success-greeting-box-headline"]').text(),
    ).toBe('order_success_page_greeting.title')
    expect(
      wrapper.get('[data-testid="success-greeting-box"]').text(),
    ).toContain('order_success_page_greeting.email_confirmation')
    expect(
      wrapper.getComponent({ name: 'SFOrderSuccessOrderData' }).props('order'),
    ).toEqual(order)
    expect(
      wrapper
        .getComponent({ name: 'SFOrderSuccessPaymentData' })
        .props('payment'),
    ).toEqual(order.payment)
    expect(
      wrapper
        .getComponent({ name: 'SFOrderSuccessAddressInfo' })
        .props('address'),
    ).toEqual(order.address)
    expect(
      wrapper.getComponent({ name: 'SFOrderSuccessCtaButtons' }).props('order'),
    ).toEqual(order)
  })

  it('skips the payment block when the order has no payment entries', () => {
    const wrapper = mount(SFOrderSuccessBasicDataSection, {
      props: { order: createMockOrder({ payment: [] }) },
      global: { ...globalConfig, stubs },
    })

    expect(
      wrapper.findComponent({ name: 'SFOrderSuccessPaymentData' }).exists(),
    ).toBe(false)
  })
})
