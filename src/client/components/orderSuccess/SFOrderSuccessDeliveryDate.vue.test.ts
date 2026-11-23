import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockOrderDelivery } from '@test/mock-data/orders'
import SFOrderSuccessDeliveryDate from './SFOrderSuccessDeliveryDate.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
}

describe('SFOrderSuccessDeliveryDate', () => {
  it('renders the delivery window and the carrier translation key', () => {
    const wrapper = mount(SFOrderSuccessDeliveryDate, {
      props: {
        delivery: createMockOrderDelivery({
          carrierKey: 'DHL',
          deliveryDate: { minimum: '01/01/2026', maximum: '03/01/2026' },
        }),
      },
      global: globalConfig,
    })

    const date = wrapper.get('[data-testid="success-delivery-date"]').text()
    expect(date).toContain('01/01/2026')
    expect(date).toContain('03/01/2026')
    expect(wrapper.get('[data-testid="success-carrier"]').text()).toContain(
      'global.carrier_key.DHL',
    )
  })
})
