// cspell:ignore Fevil Forders Fpage Платье Φόρεμα فستان
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import {
  buildOrderDetailRoute,
  buildProductDetailRoute,
  buildProductListingRoute,
  buildSearchRoute,
  getSignInRoute,
  routes,
} from './routes'

describe('buildOrderDetailRoute', () => {
  it('returns order detail route with numeric id', () => {
    expect(buildOrderDetailRoute(42)).toBe('/account/orders/42')
  })

  it('returns order detail route with string id', () => {
    expect(buildOrderDetailRoute('123')).toBe('/account/orders/123')
  })
})

describe('buildProductDetailRoute', () => {
  it.for([
    ['Product Name', 123, '/p/product-name-123'],
    ['Blue Shirt', 1, '/p/blue-shirt-1'],
    ['Hello World!', 42, '/p/hello-world-42'],
    ['A   B --- C', 5, '/p/a-b-c-5'],
    ['  Spaced  ', 99, '/p/spaced-99'],
    ['Crème Brûlée', 123, '/p/creme-brulee-123'],
  ] as const)(
    'turns the name %j with id %i into %s',
    ([name, id, expected]) => {
      expect(buildProductDetailRoute(id, name)).toBe(expected)
    },
  )

  it.for(['Платье', 'Φόρεμα', '连衣裙', 'فستان', '!!!', ''])(
    'uses the fallback slug for the name %j, which has no Latin letter or digit',
    (name) => {
      expect(buildProductDetailRoute(42, name)).toBe('/p/product-42')
    },
  )
})

describe('buildProductListingRoute', () => {
  it.for([
    ['/women', 1, '/c/women-1'],
    ['/sale', 10, '/c/sale-10'],
    ['/women/shoes', 42, '/c/women/shoes-42'],
    ['/men/clothing/shirts', 2048, '/c/men/clothing/shirts-2048'],
  ] as const)(
    'joins the category path %s and the id %i to %s',
    ([path, id, expected]) => {
      expect(buildProductListingRoute(id, path)).toBe(expected)
    },
  )
})

describe('buildSearchRoute', () => {
  it('returns search route with encoded term', () => {
    expect(buildSearchRoute('test 123')).toBe(
      '/search?filters[term]=test%20123',
    )
  })

  it('returns search route with empty term', () => {
    expect(buildSearchRoute('')).toBe('/search?filters[term]=')
  })
})

describe('getSignInRoute', () => {
  it('returns default signin route when no params are provided', () => {
    expect(getSignInRoute()).toBe('/signin')
  })

  it.for<{
    name: string
    redirectUrl: string
    register?: boolean
    expected: string
  }>([
    {
      name: 'adds the redirectUrl',
      redirectUrl: '/account',
      expected: '/signin?redirectUrl=%2Faccount',
    },
    {
      name: 'shows the register form without a redirectUrl for home',
      redirectUrl: '/',
      register: true,
      expected: '/signin?register=true',
    },
    {
      name: 'shows the register form with the redirectUrl',
      redirectUrl: '/account',
      register: true,
      expected: '/signin?register=true&redirectUrl=%2Faccount',
    },
    {
      name: 'unwraps a nested sign-in URL so register is not embedded in redirectUrl',
      redirectUrl: '/signin?register=true&redirectUrl=%2Faccount',
      register: true,
      expected: '/signin?register=true&redirectUrl=%2Faccount',
    },
    {
      name: 'unwraps a country-prefixed sign-in URL',
      redirectUrl: '/de/signin?register=true&redirectUrl=%2Faccount',
      register: true,
      expected: '/signin?register=true&redirectUrl=%2Faccount',
    },
    {
      name: 'falls back to home for a sign-in URL without a nested redirectUrl',
      redirectUrl: '/signin?register=true',
      register: true,
      expected: '/signin?register=true',
    },
    {
      name: 'preserves a hash in the redirectUrl',
      redirectUrl: '/account#settings',
      expected: '/signin?redirectUrl=%2Faccount%23settings',
    },
    {
      name: 'preserves query params and a hash in the redirectUrl',
      redirectUrl: '/account/orders?page=2#details',
      expected: '/signin?redirectUrl=%2Faccount%2Forders%3Fpage%3D2%23details',
    },
    {
      name: 'unwraps a sign-in URL while preserving nested query params and a hash',
      redirectUrl:
        '/signin?register=true&redirectUrl=%2Faccount%2Forders%3Fpage%3D2%23details',
      register: true,
      expected:
        '/signin?register=true&redirectUrl=%2Faccount%2Forders%3Fpage%3D2%23details',
    },
    {
      name: 'drops an off-origin redirect target',
      redirectUrl: 'https://evil.com',
      expected: '/signin',
    },
    {
      name: 'drops an off-origin nested redirectUrl',
      redirectUrl: '/signin?redirectUrl=https%3A%2F%2Fevil.com',
      expected: '/signin',
    },
    {
      name: 'drops a bare sign-in redirect target',
      redirectUrl: '/signin',
      expected: '/signin',
    },
    {
      name: 'drops a bare country-prefixed sign-in redirect target',
      redirectUrl: '/de/signin',
      expected: '/signin',
    },
  ])('$name', ({ redirectUrl, register, expected }) => {
    expect(getSignInRoute(redirectUrl, register)).toBe(expected)
  })
})

// Mirrors src/server/ssr-routes.ts: the product routes plus the catch-all 404 last.
function makeApp() {
  const app = new Hono()
  app.get(routes.productDetail, (c) => c.text(c.req.param('identifier')))
  app.get(routes.productListing, (c) => c.text(c.req.param('identifier')))
  app.all('/*', (c) => c.text('NOTFOUND', 404))
  return app
}

describe('productDetail route pattern', () => {
  it.for([
    ['Blue Shirt', 'blue-shirt-42'],
    ['Платье', 'product-42'],
    ['', 'product-42'],
  ] as const)(
    'matches the link built for the name %j and captures %s',
    async ([name, identifier]) => {
      const res = await makeApp().request(buildProductDetailRoute(42, name))
      expect(res.status).toBe(200)
      expect(await res.text()).toBe(identifier)
    },
  )

  it.for([
    '/p/-42', // empty slug
    '/p/42', // no slug
    '/p/Blue-Shirt-42', // uppercase is not allowed in the slug group
  ])('does not match %s', async (url) => {
    const res = await makeApp().request(url)
    expect(res.status).toBe(404)
  })
})

describe('productListing route pattern', () => {
  it.each([
    ['/c/women-shoes-42', 'women-shoes-42'], // old hyphen form still matches (for the 301)
    ['/c/women/shoes-42', 'women/shoes-42'], // new two-level slash form
    ['/c/men/clothing/shirts-2048', 'men/clothing/shirts-2048'], // three-level
    ['/c/women/t-shirts-99', 'women/t-shirts-99'], // slash plus hyphenated slug
    ['/c/women-1', 'women-1'], // single segment
  ])('matches %s and captures the identifier', async (url, identifier) => {
    const res = await makeApp().request(url)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(identifier)
  })

  it.each([
    '/c/men/clothing', // no trailing id
    '/c/Women/Shoes-42', // uppercase is not allowed in the slug group
  ])('does not match %s', async (url) => {
    const res = await makeApp().request(url)
    expect(res.status).toBe(404)
  })
})
