import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SFOrderSuccessPaymentData from './SFOrderSuccessPaymentData.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
}

describe('SFOrderSuccessPaymentData', () => {
  it('renders the first payment method translation', () => {
    const wrapper = mount(SFOrderSuccessPaymentData, {
      props: { payment: [{ key: 'paypal' }, { key: 'invoice' }] },
      global: globalConfig,
    })

    const box = wrapper.get('[data-testid="success-payment-data"]')
    expect(box.text()).toContain('global.payment_key.paypal')
    expect(box.text()).not.toContain('global.payment_key.invoice')
  })

  it('renders nothing when there is no payment', () => {
    const wrapper = mount(SFOrderSuccessPaymentData, {
      props: { payment: [] },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="success-payment-data"]').exists()).toBe(
      false,
    )
  })
})
