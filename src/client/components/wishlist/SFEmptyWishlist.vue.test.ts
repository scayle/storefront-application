import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import SFEmptyWishlist from './SFEmptyWishlist.vue'

vi.mock('@inertiajs/vue3', async () => {
  const vue = await import('vue')

  return {
    // Render the loaded state so the signed-out actions are in the DOM.
    Deferred: vue.defineComponent({
      name: 'Deferred',
      setup(_props, { slots }) {
        return () => vue.h('div', slots.default?.())
      },
    }),
  }
})

vi.mock('@client/composables/usePage', () => ({
  usePage: () => ({
    props: {
      customer: null,
      storefront: {
        config: { countrySelector: 'path' },
        country: { path: 'de', isDefault: false },
      },
    },
  }),
}))

const SFButtonStub = defineComponent({
  name: 'SFButton',
  setup(_props, { slots }) {
    return () => h('a', slots.default?.())
  },
})

describe('SFEmptyWishlist', () => {
  it('names the sign-in button by its visible text instead of an aria-label', () => {
    const wrapper = mount(SFEmptyWishlist, {
      global: {
        mocks: { $t: (key: string) => key },
        stubs: { SFButton: SFButtonStub, IconBasketEmpty: true },
      },
    })

    const signIn = wrapper.get('[data-testid="wishlist-signin"]')

    expect(signIn.attributes('aria-label')).toBeUndefined()
    expect(signIn.text()).toBe('common.sign_in')
  })
})
