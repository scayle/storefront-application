import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockOrder } from '@test/mock-data/orders'
import type { Order } from '@scayle/storefront/types'
import SFOrderSuccessOrderData from './SFOrderSuccessOrderData.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
}

const mountOrderData = (order: Order) =>
  mount(SFOrderSuccessOrderData, { props: { order }, global: globalConfig })

describe('SFOrderSuccessOrderData', () => {
  it('lists order date, order number and customer id', () => {
    const wrapper = mountOrderData(
      createMockOrder({
        id: 98765,
        confirmedAt: '2026-03-23',
        customer: { id: 4840, isGuestCustomer: false },
      }),
    )
    const items = wrapper.findAll('li')

    expect(items).toHaveLength(3)
    expect(items[0]!.text()).toContain('2026-03-23')
    expect(items[1]!.text()).toContain('98765')
    expect(items[2]!.text()).toContain('4840')
  })

  // `OrderMapper.mapOrder` collapses a date it cannot format to an empty
  // string, so an order can reach the component without a usable date.
  it('omits the order date row when confirmedAt is empty', () => {
    const wrapper = mountOrderData(createMockOrder({ confirmedAt: '' }))

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).not.toContain(
      'order_information.order_details.order_date',
    )
  })
})
