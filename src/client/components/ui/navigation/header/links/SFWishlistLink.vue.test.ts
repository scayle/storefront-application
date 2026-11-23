import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { t } from '@test/mocks/vue-i18n'
import SFWishlistLink from './SFWishlistLink.vue'

const countRef = ref(0)

vi.mock('@client/composables/useWishlist', () => {
  return {
    useWishlist: () => ({
      count: computed(() => countRef.value),
    }),
  }
})

describe('SFWishlistLink', () => {
  const globalConfig = {
    stubs: {
      SFLink: {
        template: '<a data-testid="wishlist-link"><slot /></a>',
      },
      IconWishlist: {
        template: '<span></span>',
      },
    },
    mocks: {
      $t: t,
    },
  }

  it('shows the count in the badge and passes it to the plural link label', () => {
    countRef.value = 3

    const wrapper = mount(SFWishlistLink, {
      global: globalConfig,
    })

    const badge = wrapper.get('[data-testid="header-wishlist-count"]')
    expect(badge.text()).toBe('3')

    const link = wrapper.get('[data-testid="wishlist-link"]')
    expect(link.attributes('aria-label')).toBe(t('wishlist_page.a11y.title', 3))
  })
})
