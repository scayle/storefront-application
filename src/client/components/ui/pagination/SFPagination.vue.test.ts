import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { buildPagination } from '@scayle/storefront/shared'
import type { Pagination } from '@scayle/storefront/types'
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
import SFPagination from './SFPagination.vue'

const mocks = vi.hoisted(() => ({
  page: {
    url: '/',
    props: {
      storefront: {
        config: {
          domain: 'example.com',
        },
      },
    },
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Link: {
    name: 'Link',
    // `only`/`except` are declared props so tests can assert the partial
    // reload scope; everything else stays a passthrough attribute.
    props: ['only', 'except'],
    template: '<a v-bind="$attrs"><slot /></a>',
    inheritAttrs: false,
  },
  usePage: vi.fn().mockReturnValue(mocks.page),
}))

const globalConfig = {
  stubs: {
    IconNavigationLeft: { template: '<span />' },
    IconNavigationRight: { template: '<span />' },
  },
  mocks: { $t: (key: string) => key },
}

function createPagination(
  overrides: { page?: number; last?: number } = {},
): Pagination {
  const last = overrides.last ?? 8
  return buildPagination({
    totalItems: 80,
    itemsPerPage: 10,
    currentPage: overrides.page ?? 1,
    totalPageCount: last,
    visiblePageCount: VISIBLE_PAGE_COUNT,
  })
}

function mountPagination(pagination: Pagination) {
  return mount(SFPagination, {
    props: { pagination },
    global: globalConfig,
  })
}

function mountButtonPagination(pagination: Pagination) {
  return mount(SFPagination, {
    props: { pagination, navigateBy: 'button' },
    // focus() only moves document.activeElement for an attached element.
    attachTo: document.body,
    global: globalConfig,
  })
}

function linkHref(wrapper: ReturnType<typeof mount>, testId: string): string {
  return wrapper.get(`[data-testid="${testId}"]`).attributes('href') ?? ''
}

describe('SFPagination', () => {
  beforeEach(() => {
    mocks.page.url = '/'
  })

  it('attaches URLs to visible pages from the server model', () => {
    const wrapper = mountPagination(createPagination({ last: 6, page: 1 }))

    const activePage = wrapper.get('[data-testid="paginationLink-1"]')
    expect(activePage.attributes('aria-current')).toBe('page')
    expect(activePage.attributes('href')).toBeUndefined()
    expect(linkHref(wrapper, 'paginationLink-2')).toBe('/?page=2')
    expect(linkHref(wrapper, 'paginationLink-3')).toBe('/?page=3')
    expect(linkHref(wrapper, 'paginationLink-4')).toBe('/?page=4')
    expect(linkHref(wrapper, 'paginationLink-5')).toBe('/?page=5')
    expect(linkHref(wrapper, 'paginationLink-6')).toBe('/?page=6')
  })

  it('maps first, last, previous, and next page links', () => {
    const wrapper = mountPagination(createPagination({ last: 10, page: 5 }))

    expect(linkHref(wrapper, 'paginationLink-1')).toBe('/')
    expect(linkHref(wrapper, 'paginationLink-10')).toBe('/?page=10')
    expect(linkHref(wrapper, 'paginationLink-previousPage')).toBe('/?page=4')
    expect(linkHref(wrapper, 'paginationLink-nextPage')).toBe('/?page=6')
  })

  it('builds links preserving existing query params', () => {
    mocks.page.url = '/c/shoes-123?sort=price_asc&page=2'
    const wrapper = mountPagination(createPagination({ last: 5, page: 2 }))

    expect(linkHref(wrapper, 'paginationLink-1')).toBe(
      '/c/shoes-123?sort=price_asc',
    )
    expect(linkHref(wrapper, 'paginationLink-nextPage')).toBe(
      '/c/shoes-123?sort=price_asc&page=3',
    )
  })

  it('keeps every occurrence of a filter key when changing page', () => {
    mocks.page.url = '/c/shoes-123?filters[size]=7,5&filters[size]=36&page=2'
    const wrapper = mountPagination(createPagination({ last: 5, page: 2 }))

    expect(linkHref(wrapper, 'paginationLink-nextPage')).toBe(
      // cspell:disable-next-line -- `%5Bsize%5D` tokenizes as "Bsize"
      '/c/shoes-123?filters%5Bsize%5D=7%2C5&filters%5Bsize%5D=36&page=3',
    )
  })

  it('navigates with a partial reload scoped to the listing props', () => {
    const wrapper = mountPagination(createPagination({ last: 6, page: 3 }))

    const links = wrapper.findAllComponents({ name: 'Link' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.props('only')).toEqual(['products', 'pagination', 'meta'])
      expect(link.props('except')).toBeUndefined()
    }
  })

  it.for([
    { key: 'ArrowRight', expectedTestId: 'paginationButton-5' },
    { key: 'ArrowLeft', expectedTestId: 'paginationButton-3' },
    { key: 'Home', expectedTestId: 'paginationButton-2' },
    { key: 'End', expectedTestId: 'paginationButton-nextPage' },
  ])(
    'moves focus to $expectedTestId on the advertised $key shortcut in button mode',
    async ({ key, expectedTestId }) => {
      const wrapper = mountButtonPagination(
        createPagination({ last: 6, page: 1 }),
      )

      expect(
        wrapper.get('[aria-keyshortcuts]').attributes('aria-keyshortcuts'),
      ).toContain(key)

      const pageFour = wrapper.get('[data-testid="paginationButton-4"]')
      ;(pageFour.element as HTMLButtonElement).focus()
      await pageFour.trigger('keydown', { key })

      expect(document.activeElement).toBe(
        wrapper.get(`[data-testid="${expectedTestId}"]`).element,
      )
    },
  )

  it('does not focus the active page or the disabled previous control with arrow keys', async () => {
    const wrapper = mountButtonPagination(
      createPagination({ last: 6, page: 1 }),
    )

    const pageTwo = wrapper.get('[data-testid="paginationButton-2"]')
    ;(pageTwo.element as HTMLButtonElement).focus()
    await pageTwo.trigger('keydown', { key: 'ArrowLeft' })

    expect(document.activeElement).toBe(pageTwo.element)
  })

  it('emits resetFocus when Enter is pressed on a control', async () => {
    const wrapper = mountPagination(createPagination({ last: 6, page: 3 }))

    await wrapper
      .get('[data-testid="paginationLink-4"]')
      .trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('resetFocus')).toHaveLength(1)
  })

  it.for([
    { testId: 'paginationButton-previousPage', expectedPage: 4 },
    { testId: 'paginationButton-1', expectedPage: 1 },
    { testId: 'paginationButton-6', expectedPage: 6 },
    { testId: 'paginationButton-8', expectedPage: 8 },
    { testId: 'paginationButton-nextPage', expectedPage: 6 },
  ])(
    'emits pageChange with page $expectedPage when $testId is clicked in button mode',
    async ({ testId, expectedPage }) => {
      const wrapper = mountButtonPagination(
        createPagination({ last: 8, page: 5 }),
      )

      await wrapper.get(`[data-testid="${testId}"]`).trigger('click')

      expect(wrapper.emitted('pageChange')).toEqual([[expectedPage]])
    },
  )

  it('renders disabled previous control as non-interactive on the first page', () => {
    const wrapper = mountPagination(createPagination({ last: 6, page: 1 }))

    const previous = wrapper.get('[data-testid="paginationLink-previousPage"]')
    expect(previous.attributes('role')).toBe('link')
    expect(previous.attributes('aria-disabled')).toBe('true')
    expect(previous.attributes('tabindex')).toBe('-1')
    expect(previous.attributes('href')).toBeUndefined()
  })

  it('does not emit pageChange when clicking disabled previous in button mode', async () => {
    const wrapper = mount(SFPagination, {
      props: {
        pagination: createPagination({ last: 6, page: 1 }),
        navigateBy: 'button',
      },
      global: globalConfig,
    })

    await wrapper
      .get('[data-testid="paginationButton-previousPage"]')
      .trigger('click')

    expect(wrapper.emitted('pageChange')).toBeUndefined()
  })
})
