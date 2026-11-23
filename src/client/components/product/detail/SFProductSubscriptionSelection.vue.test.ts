import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SFProductSubscriptionSelection from './SFProductSubscriptionSelection.vue'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

// The real SFButton renders, so the test sees the disabled state and the
// aria-describedby link that reach the native button.
const stubs = {
  SFDropdown: {
    template: `<div data-testid="dropdown-stub"></div>`,
    props: ['modelValue', 'items', 'placeholder', 'size', 'id'],
  },
  SFDropdownOptionItem: {
    template: `<div data-testid="dropdown-option-stub"></div>`,
    props: ['id', 'type', 'size', 'selected', 'active'],
  },
}

const globalConfig = {
  stubs,
  mocks: {
    $t: (key: string) => key,
  },
}

const subscribeButton = '[data-testid="add-item-to-basket-button-subscribe"]'

describe('SFProductSubscriptionSelection.vue', () => {
  it('disables the subscribe button when the disabled prop is set', () => {
    const wrapper = mount(SFProductSubscriptionSelection, {
      props: {
        intervals: [{ label: 'Monthly', value: 'monthly' }],
        preferredDeliveryDays: [{ day: 1, label: '1st' }],
        disabled: true,
        selectedInterval: { label: 'Monthly', value: 'monthly' },
        selectedDeliveryDay: { day: 1, label: '1st' },
      },
      global: globalConfig,
    })

    const button = wrapper.get<HTMLButtonElement>(subscribeButton)
    expect(button.element.disabled).toBe(true)
  })

  it('describes the disabled subscribe button with the visually hidden reason', () => {
    const wrapper = mount(SFProductSubscriptionSelection, {
      props: {
        intervals: [{ label: 'Monthly', value: 'monthly' }],
        preferredDeliveryDays: [{ day: 1, label: '1st' }],
        disabled: true,
        disabledReason: 'Product is sold out',
        selectedInterval: { label: 'Monthly', value: 'monthly' },
        selectedDeliveryDay: { day: 1, label: '1st' },
      },
      global: globalConfig,
    })

    const reasonId = wrapper.get(subscribeButton).attributes('aria-describedby')
    const reason = wrapper.get(`#${reasonId}`)
    expect(reason.text()).toBe('Product is sold out')
    expect(reason.classes()).toContain('sr-only')
  })
})
