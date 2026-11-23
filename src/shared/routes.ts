import {
  slugify,
  buildRoute,
  getSiteRelativePath,
} from '@scayle/storefront/shared'

const QUERY_OR_HASH_PATTERN = /[?#]/

/**
 * The single source of truth for the application's URL scheme.
 *
 * Every server-rendered route is mounted on one of these patterns (see
 * `src/server/ssr-routes.ts`), and every internal link is produced by a builder
 * below. Parameterized patterns use the Hono `:name{constraint}` syntax; the
 * builders substitute values into them through `buildRoute` (from
 * `@scayle/storefront/shared`), so the mount pattern and the generated link can
 * never drift apart.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/routing
 */
export const routes = {
  home: '/',
  homepage: '/homepage',
  basket: '/basket',
  wishlist: '/wishlist',
  checkout: '/checkout',
  search: '/search',
  signin: '/signin',
  success: '/success',
  subscriptionCancellation: '/subscription-cancellation',
  account: '/account',
  accountOrders: '/account/orders',
  /** Account order detail; the `:id` segment is constrained to digits. */
  accountOrderDetail: '/account/orders/:id{\\d+}',
  accountProfile: '/account/profile',
  accountSubscriptions: '/account/subscriptions',
  /** CMS content page mounted on a free-form slug. */
  content: '/content/:slug',
  /**
   * Product detail page (`/p/<slug>-<id>`, e.g. `/p/blue-shirt-42`).
   *
   * The `{…}` is a Hono regex constraint on the `identifier` param, with two
   * named captures:
   * - `slug`: `[a-z0-9]+(?:-[a-z0-9]+)*` matches lowercase words joined by
   *   single hyphens (`blue-shirt`). No leading, trailing, or doubled hyphen.
   *   The slug can't be empty, so `/p/-42` and `/p/42` don't match. See
   *   {@link buildProductDetailRoute} for the slug of a name without a Latin
   *   letter or digit.
   * - `id`: `\d+` is the trailing numeric product id.
   *
   * The literal `-` between the two captures keeps the id as the last
   * hyphen-separated segment, so the controller can split it back off.
   */
  productDetail:
    '/p/:identifier{(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)-(?<id>\\d+)}',
  /**
   * Product listing / category page (`/c/<segments>-<id>`, e.g.
   * `/c/women/shoes-42`). The slug mirrors the category hierarchy, so it may
   * span several path segments.
   *
   * Same shape as {@link productDetail}, with one difference: the slug's inner
   * separator is `[-/]` instead of `-`, so a slug segment can be joined by a
   * slash as well as a hyphen (`women/shoes`, `t-shirts`). Everything else is
   * identical: lowercase words only, no leading, trailing, or doubled
   * separator, and the id stays the trailing `\d+` after the final `-`.
   */
  productListing:
    '/c/:identifier{(?<slug>[a-z0-9]+(?:[-/][a-z0-9]+)*)-(?<id>\\d+)}',
} as const

/**
 * Builds the search results page URL with the given term as a filter.
 *
 * @param term - The search term to encode into the URL
 * @returns Full search URL with the `filters[term]` query parameter
 */
export function buildSearchRoute(term: string): string {
  return buildRoute(routes.search, {}, { 'filters[term]': term })
}

/**
 * Builds the order detail page URL for a specific order.
 *
 * @param id - The order ID
 * @returns Full order detail URL with the ID substituted
 */
export function buildOrderDetailRoute(id: number | string): string {
  return buildRoute(routes.accountOrderDetail, { id })
}

/**
 * Slug for a product whose name has no Latin letter or digit after diacritics
 * are removed (Cyrillic, Greek, CJK or Arabic names), or that has no name.
 */
const FALLBACK_PRODUCT_SLUG = 'product'

/**
 * Builds the product detail page path (`/p/<slug>-<id>`).
 *
 * The slug is the slugified product name, or `product` when the name has no
 * Latin letter or digit (`/p/product-42`), because the {@link routes.productDetail}
 * pattern requires a non-empty slug. The id stays the last hyphen-separated
 * segment, so the product detail controller parses it back out of the path.
 *
 * @param id - Product id, appended after the slug.
 * @param name - Product display name, slugified into the path segment. Empty
 *   when the product has no name.
 * @returns Site-relative product detail path.
 */
export function buildProductDetailRoute(id: number, name: string): string {
  const slug = slugify(name) || FALLBACK_PRODUCT_SLUG
  return buildRoute(routes.productDetail, { identifier: `${slug}-${id}` })
}

/**
 * Builds the product listing (category) page path (`/c/<segments>-<id>`).
 *
 * The category path's slashes are preserved so the URL mirrors the category
 * hierarchy (e.g. `/c/women/shoes-42`), matching the V2 scheme. The id stays the
 * last dash-separated segment so the route constraint matches and the id can be
 * parsed back out of the path.
 *
 * The `identifier` is passed through `buildRoute` as a raw param, so its slashes
 * survive instead of being encoded to `%2F`. The route's slug group accepts
 * those slashes.
 *
 * @param id - Category id, appended after the path segments.
 * @param path - Storefront API category path (e.g. `/women/shoes`); leading slash dropped.
 * @returns Site-relative product listing path.
 */
export function buildProductListingRoute(id: number, path: string): string {
  return buildRoute(
    routes.productListing,
    { identifier: `${path.slice(1)}-${id}` },
    undefined,
    { rawParams: ['identifier'] },
  )
}

/** Matches country-prefixed sign-in paths such as `/de/signin`. */
const countryPrefixedSignInPath = new RegExp(`^/[^/]+${routes.signin}$`)

/**
 * Checks whether a pathname points at the sign-in page, including country-prefixed
 * paths such as `/de/signin`.
 *
 * Uses an exact match or a single-segment prefix before `/signin`. A hypothetical
 * future route like `/checkout/signin` would also match; none of the current routes
 * do.
 */
const isSignInPath = (pathname: string): boolean =>
  pathname === routes.signin || countryPrefixedSignInPath.test(pathname)

/**
 * Resolves the post-login redirect target from a candidate URL.
 *
 * When the current page is already sign-in (for example after clicking sign-up
 * from the account popover), callers pass `$page.url`, which carries sign-in
 * query params.
 *
 * @param redirectUrl - Candidate redirect target, often the current page URL
 * @returns A safe site-relative path to redirect to after login, or home
 */
const resolvePostLoginRedirect = (redirectUrl: string): string => {
  const safeRedirect = getSiteRelativePath(redirectUrl)
  if (!safeRedirect) {
    return routes.home
  }

  // `split` always returns at least one element.
  const pathname = safeRedirect.split(QUERY_OR_HASH_PATTERN, 1)[0]!
  if (!isSignInPath(pathname)) {
    return safeRedirect
  }

  const queryStart = safeRedirect.indexOf('?')
  // Bare sign-in URL with no query (e.g. `/signin` or `/de/signin` on its own).
  if (queryStart === -1) {
    return routes.home
  }

  const hashStart = safeRedirect.indexOf('#', queryStart)
  const search =
    hashStart === -1
      ? safeRedirect.slice(queryStart + 1)
      : safeRedirect.slice(queryStart + 1, hashStart)

  return (
    getSiteRelativePath(new URLSearchParams(search).get('redirectUrl')) ??
    routes.home
  )
}

/**
 * Builds the sign in page URL with the given parameters
 * @param redirectUrl - The URL to redirect to after login
 * @param register - Whether to show the registration form
 * @returns The sign in URL with the given parameters
 */
export const getSignInRoute = (
  redirectUrl: string = routes.home,
  register: boolean = false,
): string => {
  const normalizedRedirect = resolvePostLoginRedirect(redirectUrl)
  const query: Record<string, string> = {}
  if (register) {
    query.register = register.toString()
  }
  if (normalizedRedirect !== routes.home) {
    query.redirectUrl = normalizedRedirect
  }
  return buildRoute(routes.signin, {}, query)
}
