/**
 * Cache validation test suite for V3 storefront application.
 *
 * Validates that HTTP cache headers are properly configured for public and private routes.
 * Cacheable pages (home, product listing, product detail) should return public cache headers
 * with appropriate max-age values. Non-cacheable pages (wishlist, basket) and partial
 * data requests should return no-cache headers.
 *
 * @example
 * // Run from scripts folder with default localhost URL
 * cd scripts && pnpm exec vitest run cache.test.ts
 *
 * @example
 * // Run from project root with explicit config path
 * pnpm exec vitest run scripts/cache.test.ts --config scripts/vitest.config.ts
 *
 * @example
 * // Run with custom base URL
 * BASE_ROUTE=https://staging.example.com pnpm exec vitest run cache.test.ts --config scripts/vitest.config.ts
 */
import { it, describe, expect } from 'vitest'

/**
 * Expected Cache-Control header for cacheable public pages.
 * Used to verify public routes (home, PLP, PDP) are properly cached by shared caches
 * and revalidated by browsers.
 */
const CACHE_HEADER = 'public, max-age=0, s-maxage=600'

/**
 * Expected Cache-Control header for non-cacheable private pages.
 * Used to verify authenticated routes (wishlist, basket) and partial data requests are not cached.
 */
const NO_CACHE_HEADER = 'no-store, no-cache, max-age=0, s-maxage=0'

/**
 * Cookie the session middleware sets for a logged-in customer. Only its presence counts,
 * so the suite needs no login to send it.
 */
const SKIP_CACHE_COOKIE = 'scayle-skip-cache=1'

/**
 * Session cookie a guest carries once the basket or wishlist read the session id. The
 * session middleware skips the store read on cacheable routes, so any value works.
 */
const GUEST_SESSION_COOKIE = '1-session=guest'

/**
 * Base URL for testing cache behavior.
 * Can be overridden via BASE_ROUTE environment variable.
 */
const BASE_ROUTE = process.env.BASE_ROUTE || 'https://localhost:3000'

/**
 * Test cases for cache header validation across different page types.
 *
 * Tests three categories:
 * - Public cacheable pages (homepage, product listing, product detail)
 * - Private non-cacheable pages (wishlist, basket)
 *
 * Each route is tested for:
 * 1. Proper cache headers on full page requests
 * 2. No caching for Inertia partial data requests (x-inertia-partial-data header)
 * 3. No caching for Inertia partial except requests (x-inertia-partial-except header)
 * 4. No caching for logged-in customers (scayle-skip-cache cookie)
 * 5. Unchanged cache headers for guests with a session cookie
 */
describe.for([
  {
    name: 'Homepage',
    path: '/',
    cacheable: true,
  },
  {
    name: 'PLP',
    path: '/c/women-56992',
    cacheable: true,
  },
  {
    name: 'PLP - Subcategory',
    path: '/c/accessories/caps-50350',
    cacheable: true,
  },
  {
    name: 'PDP',
    path: '/p/sneaker-forum-bold-206096',
    cacheable: true,
  },
  {
    name: 'Wishlist',
    path: '/wishlist',
    cacheable: false,
  },
  {
    name: 'Basket',
    path: '/basket',
    cacheable: false,
  },
])('$name', ({ path, cacheable }) => {
  it(`should ${cacheable ? '' : 'not '}cache HTML`, async () => {
    const response = await fetch(new URL(path, BASE_ROUTE).toString(), {
      headers: {},
    })
    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBe(cacheable ? CACHE_HEADER : NO_CACHE_HEADER)
  })

  it('should not cache HTML for a logged-in customer', async () => {
    const response = await fetch(new URL(path, BASE_ROUTE).toString(), {
      headers: { Cookie: SKIP_CACHE_COOKIE },
    })
    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBe(NO_CACHE_HEADER)
  })

  it(`should ${cacheable ? '' : 'not '}cache HTML for a guest with a session cookie`, async () => {
    const response = await fetch(new URL(path, BASE_ROUTE).toString(), {
      headers: { Cookie: GUEST_SESSION_COOKIE },
    })
    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBe(cacheable ? CACHE_HEADER : NO_CACHE_HEADER)
  })

  it.for([
    ['x-inertia-partial-data', 'title'],
    ['x-inertia-partial-except', 'user'],
  ] as const)(
    'should not cache a partial request with %s',
    async ([header, value]) => {
      const response = await fetch(new URL(path, BASE_ROUTE).toString(), {
        headers: { [header]: value },
      })
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBe(NO_CACHE_HEADER)
    },
  )
})
