import type { SEOMeta } from '@shared/types/SEO'

/**
 * Creates mock `SEOMeta` with only the required `title`, so a page test adds
 * the `description`, `robots` or `canonicalLink` it asserts on.
 *
 * @param overrides Meta fields merged over the defaults.
 * @returns Complete head meta for a page.
 */
export function createMockSEOMeta(overrides: Partial<SEOMeta> = {}): SEOMeta {
  return {
    title: 'Page title',
    ...overrides,
  }
}
