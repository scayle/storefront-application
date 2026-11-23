import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { t } from '@test/mocks/vue-i18n'
import SFClientPagination from './SFClientPagination.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const mockQuery = ref(new URLSearchParams())

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({
    query: mockQuery,
    path: ref('/account/orders'),
    baseUrl: ref('https://example.com'),
    fullPath: ref('https://example.com/account/orders'),
    hash: ref(''),
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Link: {
    template: '<a v-bind="$attrs"><slot /></a>',
    inheritAttrs: false,
  },
  usePage: vi.fn().mockReturnValue({
    url: '/account/orders',
    props: { storefront: { config: { domain: 'example.com' } } },
  }),
}))

const createItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1 }))

function mountPagination(itemCount: number, itemsPerPage: number) {
  return mount(SFClientPagination, {
    props: { items: createItems(itemCount), itemsPerPage },
    global: {
      stubs: {
        IconNavigationLeft: { template: '<span />' },
        IconNavigationRight: { template: '<span />' },
      },
      mocks: { $t: t },
    },
    slots: {
      default: `<template #default="{ paginatedItems }">
        <span v-for="item in paginatedItems" :key="item.id" data-testid="item">{{ item.id }}</span>
      </template>`,
    },
  })
}

function renderedItemIds(wrapper: ReturnType<typeof mountPagination>) {
  return wrapper.findAll('[data-testid="item"]').map((item) => item.text())
}

/** Page numbers and ellipses in the order a user reads them. */
function visibleControls(wrapper: ReturnType<typeof mountPagination>) {
  return wrapper
    .get('nav')
    .findAll('button, [aria-current], [aria-hidden="true"]')
    .map((control) => control.text())
    .filter(Boolean)
    .join(' ')
}

beforeEach(() => {
  mockQuery.value = new URLSearchParams()
  // Page changes write the URL and scroll, which happy-dom does not support.
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  vi.spyOn(window, 'scroll').mockImplementation(() => {})
})

describe('SFClientPagination', () => {
  it.for([
    { itemCount: 3, itemsPerPage: 5, expectedIds: ['1', '2', '3'] },
    { itemCount: 7, itemsPerPage: 5, expectedIds: ['1', '2', '3', '4', '5'] },
    { itemCount: 5, itemsPerPage: 2, expectedIds: ['1', '2'] },
  ])(
    'exposes the first $itemsPerPage of $itemCount items to the slot',
    ({ itemCount, itemsPerPage, expectedIds }) => {
      const wrapper = mountPagination(itemCount, itemsPerPage)

      expect(renderedItemIds(wrapper)).toEqual(expectedIds)
    },
  )

  it('hides pagination controls when items fit on a single page', () => {
    const wrapper = mountPagination(5, 5)

    expect(wrapper.find('[data-testid="client-pagination"]').exists()).toBe(
      false,
    )
  })

  it('marks the current page without an aria-label and keeps the labels on the other page buttons', () => {
    const wrapper = mountPagination(6, 5)

    const currentPage = wrapper.get('[data-testid="paginationButton-1"]')
    expect(currentPage.attributes('aria-current')).toBe('page')
    expect(currentPage.attributes('aria-label')).toBeUndefined()
    expect(
      wrapper
        .get('[data-testid="paginationButton-2"]')
        .attributes('aria-label'),
    ).toBe(t('pagination.a11y.go_to_page', { page: 2 }))
  })

  it('navigates to a specific page on page button click', async () => {
    const wrapper = mountPagination(12, 5)

    await wrapper.get('[data-testid="paginationButton-3"]').trigger('click')

    expect(renderedItemIds(wrapper)).toEqual(['11', '12'])
  })

  it('makes the next button non-interactive on the last page', async () => {
    const wrapper = mountPagination(10, 5)

    await wrapper
      .get('[data-testid="paginationButton-nextPage"]')
      .trigger('click')

    expect(
      wrapper
        .get('[data-testid="paginationButton-nextPage"]')
        .attributes('aria-disabled'),
    ).toBe('true')
  })

  describe('ellipsis and first/last page buttons', () => {
    // 40 items / 5 per page = 8 pages, which exceeds VISIBLE_PAGE_COUNT (6)
    it('shows first and last page buttons when pages exceed visible count', () => {
      const wrapper = mountPagination(40, 5)

      // First page button (dedicated)
      expect(wrapper.find('[data-testid="paginationButton-1"]').exists()).toBe(
        true,
      )
      // Last page button (dedicated)
      expect(wrapper.find('[data-testid="paginationButton-8"]').exists()).toBe(
        true,
      )
    })

    it('does not show first/last page buttons when pages fit in visible window', () => {
      // 15 items / 5 per page = 3 pages, fits in VISIBLE_PAGE_COUNT
      const wrapper = mountPagination(15, 5)

      // All 3 pages shown in the visible window, no dedicated first/last
      expect(
        wrapper.findAll('[data-testid^="paginationButton-"]'),
      ).toHaveLength(
        5, // 3 page buttons + prev + next
      )
    })

    it.for([
      { page: '1', expected: '1 2 3 ... 8' },
      { page: '8', expected: '1 ... 6 7 8' },
    ])(
      'places the ellipsis between the page window and the far end on page $page of 8',
      ({ page, expected }) => {
        mockQuery.value = new URLSearchParams({ page })

        const wrapper = mountPagination(40, 5)

        expect(visibleControls(wrapper)).toBe(expected)
      },
    )
  })
})
