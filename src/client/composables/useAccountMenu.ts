import { computed, markRaw } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { routes } from '@shared/routes'
import { localizeLink } from '@scayle/storefront/shared'
import { isActivePath } from '@shared/utils/routing'
import { useRoute } from '@client/composables/useRoute'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import IconBasket from '@assets/icons/commerce/basket.svg?component'
import IconSubscription from '@assets/icons/user/subscription.svg?component'
import IconAccount from '@assets/icons/user/account.svg?component'

const ICON_ORDERS = markRaw(IconBasket)
const ICON_SUBSCRIPTIONS = markRaw(IconSubscription)
const ICON_PROFILE = markRaw(IconAccount)

/**
 * A single entry in the My Account navigation. Shared between the desktop side
 * menu (`SFAccountSideMenu`) and the mobile chip row (`SFAccountTabs`) so both
 * stay in sync on routes, order, active state, and icons.
 */
export interface AccountMenuItem {
  /**
   * Stable name of the account page the item links to. Consumers build their
   * `data-testid` from it, so a test id does not depend on the item's position
   * or route.
   */
  id: 'orders' | 'subscriptions' | 'profile'
  /** Target account route (unlocalized; `SFLink` localizes it). */
  to: string
  /** Whether this item matches the current route, including nested paths. */
  active: boolean
  /** Leading icon component (Vue SVG). */
  icon: Component
  /** Full label with the "Your …" prefix, used by the desktop side menu. */
  title: string
  /** Bare label without the prefix, used by the compact mobile chip row. */
  shortTitle: string
}

/**
 * Provides the ordered My Account navigation items with reactive active state.
 *
 * Use in both the desktop side menu and the mobile chip row so the item set,
 * order, and active detection have a single source of truth.
 *
 * @returns An object with `items`, a computed list of {@link AccountMenuItem}.
 * @example
 * ```ts
 * const { items } = useAccountMenu()
 * // items.value[0].active === true on /account/orders
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/account
 */
export function useAccountMenu() {
  const { t } = useI18n()
  const { path } = useRoute()
  const { config } = useStorefrontConfig()

  const isActive = (to: string) =>
    isActivePath(path.value, localizeLink(config.value, to))

  const items = computed<AccountMenuItem[]>(() => [
    {
      id: 'orders',
      to: routes.accountOrders,
      active: isActive(routes.accountOrders),
      icon: ICON_ORDERS,
      title: t('account.tabs.orders'),
      shortTitle: t('account.tabs.short.orders'),
    },
    ...(config.value.country.publicFields?.subscriptionEnabled
      ? [
          {
            id: 'subscriptions',
            to: routes.accountSubscriptions,
            active: isActive(routes.accountSubscriptions),
            icon: ICON_SUBSCRIPTIONS,
            title: t('account.tabs.subscriptions'),
            shortTitle: t('account.tabs.short.subscriptions'),
          } satisfies AccountMenuItem,
        ]
      : []),
    {
      id: 'profile',
      to: routes.accountProfile,
      active: isActive(routes.accountProfile),
      icon: ICON_PROFILE,
      title: t('account.tabs.profile'),
      shortTitle: t('account.tabs.short.profile'),
    },
  ])
  return { items }
}
