import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  createMockOrder,
  createMockOrderDelivery,
} from '@test/mock-data/orders'
import SFOrderSuccessSummarySection from './SFOrderSuccessSummarySection.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: {
    $t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  },
}

const stubs = {
  SFOrderSuccessDeliveryDate: true,
  SFOrderSuccessProductCard: true,
  SFOrderSuccessPaymentSummary: true,
}

describe('SFOrderSuccessSummarySection', () => {
  it('shows the order number in the heading', () => {
    const wrapper = mount(SFOrderSuccessSummarySection, {
      props: { order: createMockOrder({ id: 7 }) },
      global: { ...globalConfig, stubs },
    })

    expect(wrapper.get('h2').text()).toContain('"orderNumber":7')
  })

  it('renders a delivery date per delivery and a product card per item', () => {
    const order = createMockOrder({
      deliveries: [
        createMockOrderDelivery({ id: 1 }),
        createMockOrderDelivery({ id: 2 }),
      ],
    })
    const wrapper = mount(SFOrderSuccessSummarySection, {
      props: { order },
      global: { ...globalConfig, stubs },
    })

    expect(
      wrapper.findAllComponents({ name: 'SFOrderSuccessDeliveryDate' }),
    ).toHaveLength(2)
    expect(
      wrapper.findAllComponents({ name: 'SFOrderSuccessProductCard' }),
    ).toHaveLength(
      order.deliveries.flatMap((delivery) => delivery.items).length,
    )
  })

  it('skips the item list for a delivery without items', () => {
    const wrapper = mount(SFOrderSuccessSummarySection, {
      props: {
        order: createMockOrder({
          deliveries: [createMockOrderDelivery({ items: [] })],
        }),
      },
      global: { ...globalConfig, stubs },
    })

    expect(
      wrapper.findComponent({ name: 'SFOrderSuccessDeliveryDate' }).exists(),
    ).toBe(true)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('passes the order cost to the payment summary', () => {
    const order = createMockOrder()
    const wrapper = mount(SFOrderSuccessSummarySection, {
      props: { order },
      global: { ...globalConfig, stubs },
    })

    expect(
      wrapper
        .getComponent({ name: 'SFOrderSuccessPaymentSummary' })
        .props('cost'),
    ).toEqual(order.cost)
  })
})
