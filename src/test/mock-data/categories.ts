import { DEFAULT_SORT } from '@scayle/storefront/shared'
import type { Category } from '@scayle/storefront/types'

/**
 * Creates a mock root `Category` as `CategoryMapperService` maps it: not a
 * sale category, sorted by the default sorting option, with no breadcrumbs
 * because a root category has no ancestors.
 *
 * @param overrides Category fields merged over the defaults.
 * @returns A complete category.
 */
export function createMockCategory(
  overrides: Partial<Category> = {},
): Category {
  return {
    id: 1,
    name: 'Women',
    link: '/c/women-1',
    depth: 0,
    isSale: false,
    defaultSortingOption: { key: 'default', config: DEFAULT_SORT },
    breadcrumbs: [],
    ...overrides,
  }
}
