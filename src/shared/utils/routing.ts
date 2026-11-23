/**
 * Checks whether a route should be considered active for a given target.
 * Used by navigation components (for example account tabs) to determine active state.
 *
 * Rules:
 * - Exact match is active: `/account/orders` matches `/account/orders`
 * - Prefix match is active only on path segment boundaries: `/account/orders/123` matches `/account/orders`
 * - Similar prefixes are not active: `/account/orders-history` does not match `/account/orders`
 *
 * @param path - Current pathname (no query/hash)
 * @param to - Target pathname to match against
 * @returns True when the target is active for the current path
 */
export const isActivePath = (path: string, to: string) => {
  if (path === to) {
    return true
  }
  if (to === '/') {
    return path === '/'
  }

  const normalizedTo = to.endsWith('/') ? to.slice(0, -1) : to
  return path.startsWith(`${normalizedTo}/`)
}
