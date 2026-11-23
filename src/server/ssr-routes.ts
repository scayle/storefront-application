/**
 * SSR Routes - Server-Side Rendered Pages
 *
 * These routes handle page rendering via Inertia.js.
 * They are mounted under the country path prefix (e.g., /de, /en).
 *
 * Every pattern comes from `@shared/routes` so the mount and the generated
 * links share a single source of truth.
 *
 * For API routes, see ./api/index.ts
 */
import { Hono } from 'hono'
import type { StorefrontVariables } from '@scayle/storefront'
import { routes } from '@shared/routes'
import {
  createAuthGuardMiddleware,
  createEncryptHistoryMiddleware,
  createRedirectMiddleware,
} from '@scayle/storefront'
import { mountController } from '@scayle/storefront/controllers'
import { ProductDetailController } from './controllers/product-detail'
import { ProductListingController } from './controllers/product-listing'
import { BasketController } from './controllers/basket'
import { WishlistController } from './controllers/wishlist'
import { CheckoutController } from './controllers/checkout'
import { SignInController } from './controllers/signin'
import { OrderSuccessController } from './controllers/orderSuccess'
import { AccountOrdersController } from './controllers/account-orders'
import { AccountOrderDetailController } from './controllers/account-order-detail'
import { AccountProfileController } from './controllers/account-profile'
import { AccountSubscriptionsController } from './controllers/account-subscriptions'
import { SubscriptionCancellationController } from './controllers/subscription-cancellation'
import { SearchController } from './controllers/search'
import {
  CmsContentController,
  CmsHomepageController,
} from './cms/controllers/cms-page'

/**
 * Registers all server-rendered storefront routes for Inertia pages.
 * Mounted under country prefixes by the storefront runtime when enabled.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/page-rendering
 */
export const ssrRouter = new Hono<{
  Variables: StorefrontVariables
}>()

// SCAYLE Panel-managed redirects for page requests. Mounted here rather than on
// the app so oRPC calls, the analytics route and static assets never trigger a
// Storefront API lookup, and registered before the controllers so a redirect
// applies before the page renders, even when the source page still exists.
// Remove if redirects are not needed.
ssrRouter.use('*', createRedirectMiddleware({ queryParamAllowlist: [] }))

// Every page carries the shared `customer`, `basket`, and `wishlist` props, so
// every history entry is encrypted and becomes unreadable on logout, not only
// those of the account area and the checkout.
ssrRouter.use('*', createEncryptHistoryMiddleware())

// Home page - Cacheable: Public CMS content, same for all visitors
mountController(ssrRouter, routes.home, CmsHomepageController)
mountController(ssrRouter, routes.homepage, CmsHomepageController)

// Product detail page - Cacheable: Public product data, same for all visitors
mountController(ssrRouter, routes.productDetail, ProductDetailController)

// Category/Product listing page - Cacheable: Public catalog data, same for all visitors
mountController(ssrRouter, routes.productListing, ProductListingController)

// Basket page - NOT cacheable: User-specific basket data varies per visitor
mountController(ssrRouter, routes.basket, BasketController)
// Wishlist page - NOT cacheable: User-specific wishlist data varies per visitor
mountController(ssrRouter, routes.wishlist, WishlistController)
// Checkout page - NOT cacheable: User-specific checkout state and session data
mountController(ssrRouter, routes.checkout, CheckoutController)

// Search results page - Cacheable: Public search results based on query params
mountController(ssrRouter, routes.search, SearchController)

// Login page - NOT cacheable: Authentication state varies per visitor
mountController(ssrRouter, routes.signin, SignInController)
// Order success page - NOT cacheable: User-specific order confirmation data
mountController(ssrRouter, routes.success, OrderSuccessController)

// Subscription cancellation page - NOT cacheable: Public page that mounts external WC
mountController(
  ssrRouter,
  routes.subscriptionCancellation,
  SubscriptionCancellationController,
)

// Account area - NOT cacheable: User-specific account data and requires authentication
ssrRouter.use(
  '/account/*',
  createAuthGuardMiddleware({ redirectTo: routes.signin }),
)
ssrRouter.get(routes.account, (ctx) =>
  ctx.get('inertia').navigate(routes.accountOrders, 302),
)
mountController(ssrRouter, routes.accountOrders, AccountOrdersController)
mountController(
  ssrRouter,
  routes.accountOrderDetail,
  AccountOrderDetailController,
)
mountController(ssrRouter, routes.accountProfile, AccountProfileController)
mountController(
  ssrRouter,
  routes.accountSubscriptions,
  AccountSubscriptionsController,
)

// CMS content pages - Cacheable: Public CMS content, same for all visitors
mountController(ssrRouter, routes.content, CmsContentController)
