import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import {
  createMockOrder,
  createMockOrderDelivery,
  createMockOrderItem,
} from '../../test/mock-data/orders'
import { SFAccountLayoutStub } from '../../test/utils/stubs'
import AccountOrderDetail from './AccountOrderDetail.vue'

const SFOrderDetailSubscriptionNoticeStub = defineComponent({
  name: 'SFOrderDetailSubscriptionNotice',
  setup() {
    return () => h('div', { 'data-testid': 'subscription-notice' })
  },
})

const SFOrderDetailHeadlineStub = defineComponent({
  name: 'SFOrderDetailHeadline',
  props: { id: { type: Number, required: true } },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'order-detail-headline',
        'data-order-id': String(props.id),
      })
  },
})

const globalConfig = {
  stubs: {
    SFAccountLayout: SFAccountLayoutStub,
    SFOrderDetailHeadline: SFOrderDetailHeadlineStub,
    SFOrderDetailBaseInformation: true,
    SFOrderDetailProductList: true,
    SFOrderDetailPaymentSummary: true,
    SFOrderDetailSubscriptionNotice: SFOrderDetailSubscriptionNoticeStub,
    PageMetaHead: true,
  },
  mocks: {
    $t: (key: string) => key,
  },
}

const meta: SEOMeta = {
  title: 'Order detail',
  robots: 'noindex, nofollow',
}

describe('AccountOrderDetail page', () => {
  it('renders the order headline for the given order', () => {
    const order = createMockOrder()

    const wrapper = mount(AccountOrderDetail, {
      props: { order, meta },
      global: globalConfig,
    })

    expect(
      wrapper
        .get('[data-testid="order-detail-headline"]')
        .attributes('data-order-id'),
    ).toBe(String(order.id))
  })

  it('hides the subscription notice when the order has no subscription items', () => {
    const wrapper = mount(AccountOrderDetail, {
      props: { order: createMockOrder(), meta },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="subscription-notice"]').exists()).toBe(
      false,
    )
  })

  it('shows the subscription notice when the order has subscription items', () => {
    const order = createMockOrder({
      deliveries: [
        createMockOrderDelivery({
          items: [
            createMockOrderItem({
              subscriptionDefinition: {
                subscriptionInterval: 'monthly',
                subscriptionDeliveryDate: '1',
              },
            }),
          ],
        }),
      ],
    })

    const wrapper = mount(AccountOrderDetail, {
      props: { order, meta },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="subscription-notice"]').exists()).toBe(
      true,
    )
  })
})
