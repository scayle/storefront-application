import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { OrderSummary } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import SFAccountOrdersList from '@client/components/account/orders/SFAccountOrdersList.vue'
import SFAccountOrdersEmptyState from '@client/components/account/orders/SFAccountOrdersEmptyState.vue'
import AccountOrders from './AccountOrders.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const tMock = (key: string) => key

const stubMeta: SEOMeta = {
  title: 'Your orders',
  robots: 'noindex, nofollow',
}

const createOrder = (id: number): OrderSummary => ({
  id,
  confirmedAt: '1/1/2025',
  itemCount: 3,
  status: 'payment_reserved',
})

const globalConfig = {
  stubs: {
    PageMetaHead: { template: '<div />' },
    SFAccountLayout: { template: '<div><slot /></div>' },
    SFAccountTabs: { template: '<div />' },
    SFAccountOrdersEmptyState: {
      template: '<div />',
    },
    SFButton: {
      props: ['to'],
      template: '<a :href="to"><slot /></a>',
    },
    SFAccountOrdersList: {
      props: ['items'],
      template: '<ul data-testid="orders-list" />',
    },
    SFHeadlineItemCount: {
      props: ['count'],
      template: '<span data-testid="orders-count">{{ count }}</span>',
    },
  },
  mocks: { $t: tMock },
}

describe('AccountOrders', () => {
  it('renders the empty state when there are no orders', () => {
    const wrapper = mount(AccountOrders, {
      props: { meta: stubMeta, orderSummaries: [] },
      global: globalConfig,
    })

    expect(wrapper.findComponent(SFAccountOrdersEmptyState).exists()).toBe(true)
    expect(wrapper.find('[data-testid="orders-headline"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="orders-list"]').exists()).toBe(false)
  })

  it('renders orders list with headline and count badge when orders exist', () => {
    const orders: OrderSummary[] = [createOrder(1), createOrder(2)]

    const wrapper = mount(AccountOrders, {
      props: { meta: stubMeta, orderSummaries: orders },
      global: globalConfig,
    })

    expect(wrapper.findComponent(SFAccountOrdersEmptyState).exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="orders-headline"]').exists()).toBe(true)
    expect(wrapper.findComponent(SFAccountOrdersList).props('items')).toEqual(
      orders,
    )

    // The headline count suffix receives the number of orders.
    expect(wrapper.get('[data-testid="orders-count"]').text()).toBe('2')
  })
})
