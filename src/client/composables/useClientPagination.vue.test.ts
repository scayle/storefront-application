import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick, defineComponent } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useClientPagination } from './useClientPagination'
import type { UseClientPaginationReturn } from './useClientPagination'

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

const createItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1 }))

/**
 * Mounts a minimal component that calls `useClientPagination` and exposes
 * the return value, providing the required Vue lifecycle context.
 */
function setup<T>(
  items: MaybeRefOrGetter<T[]>,
  itemsPerPage: MaybeRefOrGetter<number>,
) {
  let result!: UseClientPaginationReturn<T>

  const Comp = defineComponent({
    setup() {
      result = useClientPagination(items, itemsPerPage)
      return () => null
    },
  })

  const wrapper = mount(Comp)
  return { result, wrapper }
}

let pushStateSpy: ReturnType<typeof vi.spyOn>
let scrollSpy: ReturnType<typeof vi.spyOn>

const locationBeforeStubbing = Object.getOwnPropertyDescriptor(
  window,
  'location',
)!

/** Points `window.location` at a URL the tests can rewrite per scenario. */
function setWindowLocation(url: string) {
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  mockQuery.value = new URLSearchParams()
  pushStateSpy = vi
    .spyOn(window.history, 'pushState')
    .mockImplementation(() => {})
  scrollSpy = vi.spyOn(window, 'scroll').mockImplementation(() => {})
  setWindowLocation('https://example.com/account/orders')
})

afterEach(() => {
  pushStateSpy.mockRestore()
  scrollSpy.mockRestore()
  Object.defineProperty(window, 'location', locationBeforeStubbing)
})

describe('useClientPagination', () => {
  // The rest of the pagination model (`visiblePages`, navigation flags) is
  // `buildPagination`'s contract, covered by the
  // pagination tests of `@scayle/storefront`.
  it('computes lastPage from the item count and page size', () => {
    const { result } = setup(createItems(15), 5)

    expect(result.pagination.value.lastPage?.page).toBe(3)
  })

  it('returns the first page of items by default', () => {
    const { result } = setup(createItems(12), 5)

    expect(result.paginatedItems.value).toHaveLength(5)
    expect(result.paginatedItems.value[0]).toEqual({ id: 1 })
    expect(result.paginatedItems.value[4]).toEqual({ id: 5 })
  })

  it('initializes from query param', () => {
    mockQuery.value = new URLSearchParams({ page: '2' })
    const { result } = setup(createItems(15), 5)

    expect(result.currentPage.value).toBe(2)
    expect(result.paginatedItems.value[0]).toEqual({ id: 6 })
    expect(
      result.pagination.value.visiblePages.find((p) => p.isActive)?.page,
    ).toBe(2)
  })

  it.for([
    { page: '999', currentPage: 999, itemsOnPage: 0 },
    { page: '-5', currentPage: -5, itemsOnPage: 0 },
    { page: '0', currentPage: 0, itemsOnPage: 0 },
    { page: 'abc', currentPage: 1, itemsOnPage: 5 },
    { page: '1.5', currentPage: 1.5, itemsOnPage: 0 },
    { page: 'Infinity', currentPage: Infinity, itemsOnPage: 0 },
    { page: '', currentPage: 1, itemsOnPage: 5 },
    { page: '   ', currentPage: 1, itemsOnPage: 5 },
  ])(
    'parses the ?page query value "$page" and serves the matching slice',
    ({ page, currentPage, itemsOnPage }) => {
      mockQuery.value = new URLSearchParams({ page })
      const { result } = setup(createItems(10), 5)

      expect(result.currentPage.value).toBe(currentPage)
      expect(result.paginatedItems.value).toHaveLength(itemsOnPage)
    },
  )

  it('navigates to a specific page via goToPage', () => {
    const { result } = setup(createItems(15), 5)

    result.goToPage(3)

    expect(result.currentPage.value).toBe(3)
    expect(result.paginatedItems.value).toHaveLength(5)
    expect(result.paginatedItems.value[0]).toEqual({ id: 11 })
    expect(
      result.pagination.value.visiblePages.find((p) => p.isActive)?.page,
    ).toBe(3)
  })

  it('updates the browser URL via pushState on navigation', () => {
    const { result } = setup(createItems(10), 5)

    result.goToPage(2)

    expect(pushStateSpy).toHaveBeenCalled()
    const pushedUrl = pushStateSpy.mock.calls[0][2] as string
    expect(pushedUrl).toContain('page=2')
  })

  it('removes ?page param when navigating to page 1', () => {
    mockQuery.value = new URLSearchParams({ page: '2' })
    const { result } = setup(createItems(10), 5)

    result.goToPage(1)

    const pushedUrl = pushStateSpy.mock.calls[0][2] as string
    expect(pushedUrl).not.toContain('page=')
  })

  it('clamps goToPage to valid bounds', () => {
    const { result } = setup(createItems(15), 5)

    result.goToPage(100)
    expect(result.currentPage.value).toBe(3)

    result.goToPage(0)
    expect(result.currentPage.value).toBe(1)
  })

  it('scrolls to top on page change', () => {
    const { result } = setup(createItems(10), 5)

    result.goToPage(2)

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 })
  })

  it('syncs currentPage from the URL on popstate', async () => {
    const { result } = setup(createItems(15), 5)

    setWindowLocation('https://example.com/account/orders?page=3')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await nextTick()

    expect(result.currentPage.value).toBe(3)
    expect(result.paginatedItems.value[0]).toEqual({ id: 11 })
  })

  it('does not silently reclamp when items shrink; paginatedItems goes empty', async () => {
    mockQuery.value = new URLSearchParams({ page: '6' })
    const items = ref(createItems(30))
    const { result } = setup(items, 5)

    expect(result.currentPage.value).toBe(6)

    items.value = createItems(10)
    await nextTick()

    expect(result.currentPage.value).toBe(6)
    expect(result.paginatedItems.value).toHaveLength(0)
    expect(result.pagination.value.lastPage?.page).toBe(2)
  })

  it('handles single-page datasets', () => {
    const { result } = setup(createItems(3), 5)

    expect(result.pagination.value.lastPage?.page).toBe(1)
    expect(result.paginatedItems.value).toHaveLength(3)
  })

  it('handles empty items', () => {
    const { result } = setup([], 5)

    expect(result.pagination.value.lastPage?.page).toBe(1)
    expect(result.paginatedItems.value).toHaveLength(0)
  })

  it('accepts reactive itemsPerPage', async () => {
    const items = ref(createItems(10))
    const perPage = ref(5)
    const { result } = setup(items, perPage)

    expect(result.pagination.value.lastPage?.page).toBe(2)

    perPage.value = 10
    await nextTick()

    expect(result.pagination.value.lastPage?.page).toBe(1)
    expect(result.paginatedItems.value).toHaveLength(10)
  })
})
