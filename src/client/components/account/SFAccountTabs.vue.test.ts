import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { routes } from '@shared/routes'
import { SFLinkStub } from '@test/stubs/common'
import { t } from '@test/mocks/vue-i18n'
import SFAccountTabs from './SFAccountTabs.vue'

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

const mountTabs = () =>
  mount(SFAccountTabs, {
    attachTo: document.body,
    global: {
      stubs: {
        SFLink: SFLinkStub,
        SFItemSlider: { template: '<div><slot /></div>' },
      },
      mocks: { $t: t },
    },
  })

describe('SFAccountTabs', () => {
  let scrollIntoView: MockInstance<Element['scrollIntoView']>

  beforeEach(() => {
    scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
  })

  // Item order, the subscriptions flag and nested-route matching are
  // useAccountMenu's contract (useAccountMenu.test.ts); this test covers the
  // tabs' binding of each item to its link.
  it('renders a tab link per menu item with its short title and marks the active one as the current page', () => {
    const wrapper = mountTabs()

    expect(
      wrapper.findAll('a').map((link) => ({
        href: link.attributes('href'),
        title: link.text(),
        current: link.attributes('aria-current'),
      })),
    ).toEqual([
      {
        href: routes.accountOrders,
        title: 'account.tabs.short.orders',
        current: undefined,
      },
      {
        href: routes.accountSubscriptions,
        title: 'account.tabs.short.subscriptions',
        current: undefined,
      },
      {
        href: routes.accountProfile,
        title: 'account.tabs.short.profile',
        current: 'page',
      },
    ])
  })

  it('scrolls the active tab into view on mount', () => {
    const wrapper = mountTabs()

    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView.mock.instances[0]).toBe(
      wrapper.get('[aria-current="page"]').element,
    )
  })

  it('scrolls a clicked tab into view', async () => {
    const wrapper = mountTabs()
    const ordersTab = wrapper.get(`a[href="${routes.accountOrders}"]`)
    scrollIntoView.mockClear()

    await ordersTab.trigger('click')

    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView.mock.instances[0]).toBe(ordersTab.element)
  })
})
