import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import { createMockOrder } from '../../test/mock-data/orders'
import OrderSuccess from './OrderSuccess.vue'

const mocks = vi.hoisted(() => ({
  trackPurchase: vi.fn(),
}))

vi.mock('@client/composables/tracking/useOrderEvents', () => ({
  useOrderEvents: () => ({ trackPurchase: mocks.trackPurchase }),
}))

const SFOrderSuccessEmptyStateStub = defineComponent({
  name: 'SFOrderSuccessEmptyState',
  setup() {
    return () => h('div', { 'data-testid': 'order-success-empty-state' })
  },
})

const globalConfig = {
  stubs: {
    SFOrderSuccessBasicDataSection: true,
    SFOrderSuccessSummarySection: true,
    SFOrderSuccessCtaButtons: true,
    SFOrderSuccessEmptyState: SFOrderSuccessEmptyStateStub,
    PageMetaHead: true,
  },
  mocks: { $t: (key: string) => key },
}

const meta: SEOMeta = {
  title: 'Order confirmed',
  robots: 'noindex, nofollow',
}

describe('OrderSuccess page', () => {
  it('renders the order summary sections when an order is present', () => {
    const wrapper = mount(OrderSuccess, {
      props: { order: createMockOrder(), meta },
      global: globalConfig,
    })

    expect(
      wrapper.find('[data-testid="order-success-container"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="order-success-empty-state"]').exists(),
    ).toBe(false)
    expect(mocks.trackPurchase).toHaveBeenCalledWith(wrapper.props('order'))
  })

  it('renders the empty state when no order is available', () => {
    const wrapper = mount(OrderSuccess, {
      props: { meta },
      global: globalConfig,
    })

    expect(
      wrapper.find('[data-testid="order-success-empty-state"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="order-success-container"]').exists(),
    ).toBe(false)
    expect(mocks.trackPurchase).not.toHaveBeenCalled()
  })
})
