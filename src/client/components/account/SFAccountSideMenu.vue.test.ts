import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { routes } from '@shared/routes'
import { SFLinkStub } from '@test/stubs/common'
import { t } from '@test/mocks/vue-i18n'
import SFAccountSideMenu from './SFAccountSideMenu.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({ path: ref(`/en${routes.accountProfile}`) }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: ref({
      config: { countrySelector: 'path' },
      country: {
        path: 'en',
        isDefault: false,
        publicFields: { subscriptionEnabled: true },
      },
    }),
  }),
}))

describe('SFAccountSideMenu', () => {
  // Item order, the subscriptions flag and nested-route matching are
  // useAccountMenu's contract (useAccountMenu.test.ts); this test covers the
  // menu's binding of each item to its link.
  it('renders a link per menu item with its full title and marks the active one as the current page', () => {
    const wrapper = mount(SFAccountSideMenu, {
      global: { stubs: { SFLink: SFLinkStub }, mocks: { $t: t } },
    })

    expect(
      wrapper.findAll('a').map((link) => ({
        href: link.attributes('href'),
        title: link.text(),
        current: link.attributes('aria-current'),
      })),
    ).toEqual([
      {
        href: routes.accountOrders,
        title: 'account.tabs.orders',
        current: undefined,
      },
      {
        href: routes.accountSubscriptions,
        title: 'account.tabs.subscriptions',
        current: undefined,
      },
      {
        href: routes.accountProfile,
        title: 'account.tabs.profile',
        current: 'page',
      },
    ])
  })
})
