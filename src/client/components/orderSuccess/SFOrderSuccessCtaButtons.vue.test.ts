import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { routes } from '@shared/routes'
import { createMockOrder } from '@test/mock-data/orders'
import SFOrderSuccessCtaButtons from './SFOrderSuccessCtaButtons.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
}

const stubs = {
  SFButton: {
    props: ['to'],
    template: '<a :href="to" v-bind="$attrs"><slot /></a>',
  },
}

describe('SFOrderSuccessCtaButtons', () => {
  it('links to home and to the order details for a registered customer', () => {
    const wrapper = mount(SFOrderSuccessCtaButtons, {
      props: { order: createMockOrder({ id: 42 }) },
      global: { ...globalConfig, stubs },
    })
    const orderDetailsLink = wrapper.get(
      '[data-testid="success-order-details-button"]',
    )

    expect(
      wrapper
        .get('[data-testid="success-continue-shopping-button"]')
        .attributes('href'),
    ).toBe(routes.home)
    expect(orderDetailsLink.attributes('href')).toBe(
      `${routes.account}/orders/42`,
    )
    expect(orderDetailsLink.text()).toBe(
      'order_success_page.go_to_order_details',
    )
  })

  it('hides the order details link for a guest customer', () => {
    const wrapper = mount(SFOrderSuccessCtaButtons, {
      props: {
        order: createMockOrder({ customer: { id: 1, isGuestCustomer: true } }),
      },
      global: { ...globalConfig, stubs },
    })

    expect(
      wrapper.find('[data-testid="success-continue-shopping-button"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="success-order-details-button"]').exists(),
    ).toBe(false)
  })
})
