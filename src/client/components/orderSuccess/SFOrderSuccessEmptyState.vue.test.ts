import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { routes } from '@shared/routes'
import SFOrderSuccessEmptyState from './SFOrderSuccessEmptyState.vue'

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

describe('SFOrderSuccessEmptyState', () => {
  it('renders headline, description and a link back to the home page', () => {
    const wrapper = mount(SFOrderSuccessEmptyState, {
      global: { ...globalConfig, stubs },
    })

    expect(wrapper.get('[data-testid="empty-state-headline"]').text()).toBe(
      'order_success_page.no_order_found.title',
    )
    expect(wrapper.get('[data-testid="empty-state-subheadline"]').text()).toBe(
      'order_success_page.no_order_found.description',
    )
    const cta = wrapper.get('[data-testid="button-continue-shopping"]')
    expect(cta.attributes('href')).toBe(routes.home)
    expect(cta.text()).toBe('common.continue_shopping')
  })
})
