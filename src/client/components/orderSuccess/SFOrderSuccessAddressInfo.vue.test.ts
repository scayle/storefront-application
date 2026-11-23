import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defaultAddresses, separateAddresses } from '@test/mock-data/orders'
import SFOrderSuccessAddressInfo from './SFOrderSuccessAddressInfo.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
}

describe('SFOrderSuccessAddressInfo', () => {
  it('merges both addresses into one box when they render the same lines', () => {
    const wrapper = mount(SFOrderSuccessAddressInfo, {
      props: { address: defaultAddresses },
      global: globalConfig,
    })

    const delivery = wrapper.get('[data-testid="success-delivery-address"]')
    expect(delivery.text()).toContain(
      'order_information.address_details.delivery_and_billing_address',
    )
    expect(
      wrapper.find('[data-testid="success-billing-address"]').exists(),
    ).toBe(false)
  })

  it('renders a box for each address when the lines differ', () => {
    const wrapper = mount(SFOrderSuccessAddressInfo, {
      props: { address: separateAddresses },
      global: globalConfig,
    })

    const delivery = wrapper.get('[data-testid="success-delivery-address"]')
    const billing = wrapper.get('[data-testid="success-billing-address"]')

    expect(delivery.text()).toContain(
      'order_information.address_details.delivery_address',
    )
    expect(billing.text()).toContain(
      'order_information.address_details.billing_address',
    )
    expect(billing.text()).toContain('Jane Doe')
  })
})
