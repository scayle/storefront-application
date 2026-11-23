import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { SortOption } from '@scayle/storefront/types'
import { PRODUCT_LISTING_RELOAD_PROPS } from '@shared/constants/productListing'
import { useSorting } from './useSorting'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

const currentUrl = ref(new URL('https://example.com/c/women-1'))

vi.mock('./useRoute', () => ({
  useRoute: () => ({
    path: computed(() => currentUrl.value.pathname),
    query: computed(() => new URLSearchParams(currentUrl.value.search)),
    navigate,
  }),
}))

const sortOption = (key: string): SortOption => ({ key, config: {} })

const visit = (path: string) => {
  currentUrl.value = new URL(path, 'https://example.com')
}

describe('useSorting', () => {
  beforeEach(() => {
    visit('/c/women-1')
  })

  it.for([
    {
      when: 'the listing is on a later page',
      from: '/c/women-1?page=2',
      to: '/c/women-1?sort=price_asc',
    },
    {
      // A filter group with several selected values writes one occurrence per
      // value, and every one has to survive the round trip.
      when: 'a filter key occurs more than once',
      from: '/c/women-1?filters[size]=7,5&filters[size]=36',
      // cspell:disable-next-line -- `%5Bsize%5D` tokenizes as "Bsize"
      to: '/c/women-1?filters%5Bsize%5D=7%2C5&filters%5Bsize%5D=36&sort=price_asc',
    },
    {
      when: 'a sort is already in the URL',
      from: '/c/women-1?sort=newest&page=2',
      to: '/c/women-1?sort=price_asc',
    },
  ])('navigates to the sorted URL when $when', ({ from, to }) => {
    visit(from)

    useSorting(undefined).applySort('price_asc')

    expect(navigate).toHaveBeenCalledWith(to, expect.anything())
  })

  it('reloads the listing props and the sorting prop with the page state kept', () => {
    useSorting(undefined).applySort('price_asc')

    expect(navigate).toHaveBeenCalledWith(expect.any(String), {
      only: [...PRODUCT_LISTING_RELOAD_PROPS, 'sorting'],
      preserveState: true,
    })
  })

  it('does not navigate when the key is already selected', () => {
    useSorting(sortOption('price_asc')).applySort('price_asc')

    expect(navigate).not.toHaveBeenCalled()
  })

  it('compares with the selection at call time, not at setup', () => {
    const selected = ref(sortOption('newest'))
    const { applySort } = useSorting(() => selected.value)

    selected.value = sortOption('price_asc')
    applySort('price_asc')

    expect(navigate).not.toHaveBeenCalled()
  })
})
