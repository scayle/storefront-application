import { ref } from 'vue'
import type { Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@shared/routes'
import { useAccountMenu } from './useAccountMenu'

const mocks = vi.hoisted(() => ({
  path: null as Ref<string> | null,
  subscriptionEnabled: true,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useRoute', () => {
  mocks.path = ref('/account/orders')
  return { useRoute: () => ({ path: mocks.path }) }
})

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: {
        country: {
          publicFields: { subscriptionEnabled: mocks.subscriptionEnabled },
        },
      },
    },
    country: {
      path: 'en',
      isDefault: false,
    },
  }),
}))

// `localizeLink` is exercised by its own tests; here it is an identity so the
// active-state assertions read against the raw account routes.
vi.mock('@scayle/storefront/shared', () => ({
  localizeLink: (_config: unknown, to: string) => to,
}))

// SVG `?component` imports are not resolvable in the node test project; the
// composable only stores them, so a marker object per icon is enough.
vi.mock('@assets/icons/commerce/basket.svg?component', () => ({
  default: { name: 'IconBasket' },
}))
vi.mock('@assets/icons/user/subscription.svg?component', () => ({
  default: { name: 'IconSubscription' },
}))
vi.mock('@assets/icons/user/account.svg?component', () => ({
  default: { name: 'IconAccount' },
}))

describe('useAccountMenu', () => {
  beforeEach(() => {
    mocks.path!.value = '/account/orders'
    mocks.subscriptionEnabled = true
  })

  describe('items', () => {
    it('leaves out the subscriptions entry when subscriptions are disabled for the shop', () => {
      mocks.subscriptionEnabled = false
      const { items } = useAccountMenu()

      expect(items.value.map((item) => item.to)).toEqual([
        routes.accountOrders,
        routes.accountProfile,
      ])
    })

    it('exposes an id, full and short titles, and an icon for each entry', () => {
      const { items } = useAccountMenu()

      expect(items.value).toEqual([
        expect.objectContaining({
          id: 'orders',
          to: routes.accountOrders,
          title: 'account.tabs.orders',
          shortTitle: 'account.tabs.short.orders',
          icon: { name: 'IconBasket' },
        }),
        expect.objectContaining({
          id: 'subscriptions',
          to: routes.accountSubscriptions,
          title: 'account.tabs.subscriptions',
          shortTitle: 'account.tabs.short.subscriptions',
          icon: { name: 'IconSubscription' },
        }),
        expect.objectContaining({
          id: 'profile',
          to: routes.accountProfile,
          title: 'account.tabs.profile',
          shortTitle: 'account.tabs.short.profile',
          icon: { name: 'IconAccount' },
        }),
      ])
    })
  })

  describe('active state', () => {
    it('marks only the entry matching the current path as active', () => {
      mocks.path!.value = routes.accountSubscriptions
      const { items } = useAccountMenu()

      expect(items.value.map((item) => item.active)).toEqual([
        false,
        true,
        false,
      ])
    })

    it('treats a nested path as active for its parent route', () => {
      mocks.path!.value = '/account/orders/123'
      const { items } = useAccountMenu()

      expect(items.value[0]!.active).toBe(true)
    })

    it('does not mark a similar prefix as active', () => {
      mocks.path!.value = '/account/orders-history'
      const { items } = useAccountMenu()

      expect(items.value[0]!.active).toBe(false)
    })

    it('recomputes active state when the route changes', () => {
      const { items } = useAccountMenu()
      expect(items.value[0]!.active).toBe(true)

      mocks.path!.value = routes.accountProfile

      expect(items.value.map((item) => item.active)).toEqual([
        false,
        false,
        true,
      ])
    })
  })
})
