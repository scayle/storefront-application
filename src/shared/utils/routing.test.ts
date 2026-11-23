import { describe, expect, it } from 'vitest'
import { isActivePath } from './routing'

describe('isActivePath', () => {
  it.for<{ name: string; path: string; to: string; expected: boolean }>([
    {
      name: 'an exact match',
      path: '/account/orders',
      to: '/account/orders',
      expected: true,
    },
    {
      name: 'a prefix match on a path segment boundary',
      path: '/account/orders/123',
      to: '/account/orders',
      expected: true,
    },
    {
      name: 'a similar prefix without a segment boundary',
      path: '/account/orders-history',
      to: '/account/orders',
      expected: false,
    },
    {
      name: 'a different path',
      path: '/account/settings',
      to: '/account/orders',
      expected: false,
    },
    {
      name: 'a current path with a trailing slash',
      path: '/account/orders/',
      to: '/account/orders',
      expected: true,
    },
    {
      name: 'a target with a trailing slash',
      path: '/account/orders/123',
      to: '/account/orders/',
      expected: true,
    },
    {
      name: 'an empty path',
      path: '',
      to: '/account/orders',
      expected: false,
    },
    // Every path starts with `/`, so the home target matches only itself.
    {
      name: 'a page below the home target',
      path: '/account',
      to: '/',
      expected: false,
    },
  ])('returns $expected for $name', ({ path, to, expected }) => {
    expect(isActivePath(path, to)).toBe(expected)
  })
})
