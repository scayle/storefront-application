import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { routes } from '@shared/routes'
import { t } from '@test/mocks/vue-i18n'
import SFAccountOrdersEmptyState from './SFAccountOrdersEmptyState.vue'

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({ navigate: mocks.navigate }),
}))

describe('SFAccountOrdersEmptyState', () => {
  it('navigates to the home page when continue shopping is clicked', async () => {
    const wrapper = mount(SFAccountOrdersEmptyState, {
      global: {
        stubs: {
          SFButton: { template: '<button type="button"><slot /></button>' },
          IconBasketEmpty: true,
        },
        mocks: { $t: t },
      },
    })

    await wrapper
      .get('[data-testid="button-continue-shopping"]')
      .trigger('click')

    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith(routes.home)
  })
})
