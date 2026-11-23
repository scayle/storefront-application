import { describe, expect, it, vi } from 'vitest'
import type {
  SSRRenderContext,
  ServiceRegistry,
  StorefrontVariables,
} from '@scayle/storefront'
import type { PartialMembers } from '@scayle/storefront/test'
import type { ServerI18nService } from '@server/services/i18n'
import type { SEOMeta } from '@shared/types/SEO'
import { createMockBasket } from '../../test/mock-data/basket'
import { createMockOrder } from '../../test/mock-data/orders'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { AccountOrderDetailController } from './account-order-detail'
import { AccountOrdersController } from './account-orders'
import { AccountProfileController } from './account-profile'
import { AccountSubscriptionsController } from './account-subscriptions'
import { BasketController } from './basket'
import { CheckoutController } from './checkout'
import { OrderSuccessController } from './orderSuccess'
import { SearchController } from './search'
import { SubscriptionCancellationController } from './subscription-cancellation'
import { WishlistController } from './wishlist'

interface PageCase extends Pick<
  PartialMembers<StorefrontVariables>,
  'inertia'
> {
  page: string
  Controller: new (ctx: SSRRenderContext) => { view: () => Promise<Response> }
  title: (i18n: ServerI18nService) => string
  url?: string
  params?: Record<string, string>
  services?: () => PartialMembers<ServiceRegistry>
}

// Each controller passes `getShopName()` to `withShopName`, whose own fallback
// is covered in the SEO utility tests. This table checks that no page renders a
// suffix without a shop name. Each controller's own test asserts the suffix.
describe('page meta title when the shop configuration cannot be read', () => {
  it.for<PageCase>([
    {
      page: 'AccountProfile',
      Controller: AccountProfileController,
      title: (i18n) => i18n.t('account.profile.meta.title'),
    },
    {
      page: 'AccountOrders',
      Controller: AccountOrdersController,
      title: (i18n) => i18n.t('account.orders.meta.title'),
    },
    {
      page: 'AccountOrderDetail',
      Controller: AccountOrderDetailController,
      title: (i18n) => i18n.t('account.order_detail.meta.title', { id: 123 }),
      params: { id: '123' },
      services: () => ({
        order: {
          getOrder: vi.fn().mockResolvedValue(createMockOrder({ id: 123 })),
        },
      }),
    },
    {
      page: 'AccountSubscriptions',
      Controller: AccountSubscriptionsController,
      title: (i18n) => i18n.t('subscription.page.meta.title'),
    },
    {
      page: 'SubscriptionCancellation',
      Controller: SubscriptionCancellationController,
      title: (i18n) => i18n.t('subscription.cancellation.meta.title'),
    },
    {
      page: 'Wishlist',
      Controller: WishlistController,
      title: (i18n) => i18n.t('wishlist_page.meta.title'),
    },
    {
      page: 'OrderSuccess',
      Controller: OrderSuccessController,
      title: (i18n) => i18n.t('order_success_page.meta.title'),
      url: 'https://example.com/de/success?cbd=valid-token',
      services: () => ({
        order: {
          getOrderFromCBD: vi.fn().mockResolvedValue(createMockOrder()),
        },
      }),
    },
    {
      page: 'Basket',
      Controller: BasketController,
      title: (i18n) => i18n.t('basket_page.meta.title'),
      services: () => ({
        basket: {
          getBasketKey: vi.fn(() => 'basket-key'),
          fetchBasket: vi.fn().mockResolvedValue(createMockBasket()),
        },
      }),
    },
    {
      page: 'Checkout',
      Controller: CheckoutController,
      title: (i18n) => i18n.t('checkout_page.meta.title'),
      services: () => ({
        basket: {
          getBasketKey: vi.fn(() => 'basket-key'),
          fetchBasket: vi.fn().mockResolvedValue(createMockBasket()),
        },
      }),
    },
    {
      page: 'Search',
      Controller: SearchController,
      title: (i18n) => i18n.t('search_page.meta.title', { term: 'shoes' }),
      url: 'https://example.com/de/search?filters[term]=shoes',
      // Skips the term resolve in `beforeRender`, so no search service mock is needed
      inertia: { isMainRequest: () => false },
    },
  ])(
    'leaves the shop suffix out of the $page title',
    async ({ Controller, title, url, params, services, inertia }) => {
      const storefront = createMockStorefrontContext({
        country: {
          publicFields: {
            subscriptionEnabled: true,
            consentManagementRequired: false,
          },
        },
      })
      const mappers = createMockMapperRegistry(storefront)
      const ctx = createMockSSRRenderContext({
        url,
        params,
        variables: {
          storefront,
          mappers,
          services: createMockServiceRegistry({
            ...services?.(),
            shopConfig: { getShopName: vi.fn().mockResolvedValue(undefined) },
          }),
          inertia,
        },
      })

      await new Controller(ctx).view()

      const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      await expect(meta()).resolves.toHaveProperty('title', title(mappers.i18n))
    },
  )
})
