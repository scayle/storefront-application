import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { buildPagination } from '@scayle/storefront/shared'
import type { AppliedFilters } from '@scayle/storefront/types'
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
import { createMockListingProduct } from '@test/mock-data/products'
import SFProductCard from './SFProductCard.vue'
import SFProductGrid from './SFProductGrid.vue'
import SFProductListNoResults from './SFProductListNoResults.vue'

const mocks = vi.hoisted(() => ({
  trackSelectItem: vi.fn(),
  trackViewItemList: vi.fn(),
  trackViewProductTile: vi.fn(),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => mocks,
}))

vi.mock('@client/utils/focus', () => ({ getFirstFocusable: vi.fn() }))

const pagination = buildPagination({
  totalItems: 12,
  itemsPerPage: 12,
  currentPage: 1,
  totalPageCount: 1,
  visiblePageCount: VISIBLE_PAGE_COUNT,
})

const appliedFilters: AppliedFilters = {
  attributes: {},
  booleans: {},
  count: 0,
}

const mountGrid = (productCount: number, productListId?: string) =>
  shallowMount(SFProductGrid, {
    props: {
      products: Array.from({ length: productCount }, (_, index) =>
        createMockListingProduct({ id: index + 1 }),
      ),
      appliedFilters,
      pagination,
      productListType: 'category',
      productListId,
    },
  })

describe('SFProductGrid image priority', () => {
  it('gives fetchpriority high to the first card only', () => {
    const cards = mountGrid(5).findAllComponents(SFProductCard)

    expect(cards).toHaveLength(5)
    expect(cards[0]!.props('fetchPriority')).toBe('high')
    for (const card of cards.slice(1)) {
      expect(card.props('fetchPriority')).toBeUndefined()
    }
  })
})

describe('SFProductGrid empty list', () => {
  it('shows the no-results message instead of cards when there are no products', () => {
    const wrapper = mountGrid(0)

    expect(wrapper.findComponent(SFProductListNoResults).exists()).toBe(true)
    expect(wrapper.findAllComponents(SFProductCard)).toHaveLength(0)
  })

  it('shows the no-results slot instead of the category message when one is passed', () => {
    const wrapper = shallowMount(SFProductGrid, {
      props: {
        products: [],
        appliedFilters,
        pagination,
        productListType: 'search_results',
      },
      slots: { 'no-results': '<p data-testid="custom-no-results" />' },
    })

    expect(wrapper.find('[data-testid="custom-no-results"]').exists()).toBe(
      true,
    )
    expect(wrapper.findComponent(SFProductListNoResults).exists()).toBe(false)
  })
})

describe('SFProductGrid list tracking', () => {
  it('tracks the list once with the surface and the paginated total', async () => {
    const wrapper = mountGrid(2)

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)
    expect(mocks.trackViewItemList).toHaveBeenCalledWith(expect.any(Array), {
      product_list_type: 'category',
      product_list_id: undefined,
      total: 12,
    })

    // A pagination or filter partial reload swaps the products in place.
    await wrapper.setProps({
      products: [createMockListingProduct({ id: 99 })],
    })

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)
  })

  it('tracks only the intersected card as a tile, with its list-wide position', () => {
    const cards = mountGrid(3, '50342').findAllComponents(SFProductCard)

    cards[1]!.vm.$emit('intersectProduct', 2)

    expect(mocks.trackViewProductTile).toHaveBeenCalledOnce()
    expect(mocks.trackViewProductTile).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2 }),
      {
        product_list_type: 'category',
        product_list_id: '50342',
        total: 12,
        position: 2,
      },
    )
  })

  it('tracks the list again when the category changes under a preserveState visit', async () => {
    const wrapper = mountGrid(2, '50342')

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ productListId: '50343' })

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(2)
    expect(mocks.trackViewItemList).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ product_list_id: '50343' }),
    )
  })
})

describe('SFProductGrid image view', () => {
  it('forwards the selected image type to every card', () => {
    const cards = shallowMount(SFProductGrid, {
      props: {
        products: [
          createMockListingProduct({ id: 1 }),
          createMockListingProduct({ id: 2 }),
        ],
        appliedFilters,
        pagination,
        productListType: 'category',
        imageType: 'type-a',
      },
    }).findAllComponents(SFProductCard)

    expect(cards.map((card) => card.props('imageType'))).toEqual([
      'type-a',
      'type-a',
    ])
  })
})
