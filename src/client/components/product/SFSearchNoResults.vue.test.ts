import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AppliedFilters, NavigationItem } from '@scayle/storefront/types'
import { routes } from '@shared/routes'
import { t } from '@test/mocks/vue-i18n'
import { SFButtonStub } from '@test/stubs/common'
import SFSearchNoResults from './SFSearchNoResults.vue'

const mocks = vi.hoisted(() => ({
  navigation: [] as NavigationItem[],
  resetAllFilters: vi.fn(),
}))

vi.mock('@client/composables/usePage', () => ({
  usePage: () => ({ props: { navigation: mocks.navigation } }),
}))

vi.mock('@client/composables/useFilter', () => ({
  useFilter: () => ({ resetAllFilters: mocks.resetAllFilters }),
}))

const createNavigationItem = (
  overrides: Partial<NavigationItem> = {},
): NavigationItem => ({
  id: 1,
  name: 'Women',
  href: '/c/women-1',
  openInNewWindow: false,
  children: [],
  disabled: false,
  ...overrides,
})

const termOnly: AppliedFilters = {
  term: 'xyzabc',
  attributes: {},
  booleans: {},
  count: 0,
}

const termAndColor: AppliedFilters = {
  term: 'xyzabc',
  attributes: { color: ['red'] },
  booleans: {},
  count: 1,
}

const mountNoResults = (
  appliedFilters: AppliedFilters,
  navigation: NavigationItem[] = [],
) => {
  mocks.navigation = navigation
  return mount(SFSearchNoResults, {
    props: { appliedFilters, productListId: 'xyzabc' },
    global: { mocks: { $t: t }, stubs: { SFButton: SFButtonStub } },
  })
}

describe('SFSearchNoResults', () => {
  it('shows the search text instead of the category text', () => {
    const wrapper = mountNoResults(termOnly)

    expect(wrapper.text()).toContain('search_page.no_results.title')
    expect(wrapper.text()).not.toContain('product_list_no_results.description')
  })

  it('links to the homepage', () => {
    const wrapper = mountNoResults(termOnly)

    expect(
      wrapper.get('[data-testid="search-no-results-home"]').attributes('href'),
    ).toBe(routes.home)
  })

  it('hides "Reset filters" for a term only search', () => {
    const wrapper = mountNoResults(termOnly)

    expect(
      wrapper.find('[data-testid="search-reset-filters-button"]').exists(),
    ).toBe(false)
  })

  it('offers to reset the filters when a filter is applied to the term', async () => {
    const wrapper = mountNoResults(termAndColor)

    await wrapper
      .get('[data-testid="search-reset-filters-button"]')
      .trigger('click')

    expect(mocks.resetAllFilters).toHaveBeenCalledOnce()
  })

  it('links to each enabled main category and skips disabled or link-less items', () => {
    const wrapper = mountNoResults(termOnly, [
      createNavigationItem({ id: 1, name: 'Women', href: '/c/women-1' }),
      createNavigationItem({ id: 2, name: 'Men', href: '/c/men-2' }),
      createNavigationItem({ id: 3, name: 'Gift cards', disabled: true }),
      createNavigationItem({ id: 4, name: 'Stores', href: '' }),
      createNavigationItem({ id: 5, name: 'Sale', href: '#' }),
    ])

    expect(
      wrapper
        .findAll('[data-testid="search-no-results-category"]')
        .map((link) => link.attributes('href')),
    ).toEqual(['/c/women-1', '/c/men-2'])
  })

  it('hides the category links when no navigation item is a link', () => {
    const wrapper = mountNoResults(termOnly, [
      createNavigationItem({ disabled: true }),
    ])

    expect(
      wrapper.find('[data-testid="search-no-results-categories"]').exists(),
    ).toBe(false)
  })
})
