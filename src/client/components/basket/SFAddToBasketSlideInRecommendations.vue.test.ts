import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListingProduct } from '@scayle/storefront/types'
import { ProductSliderIds, TrackingItemListIds } from '@shared/types/Tracking'
import { createMockListingProduct } from '@test/mock-data/products'
import SFAddToBasketSlideInRecommendations from './SFAddToBasketSlideInRecommendations.vue'

const mocks = vi.hoisted(() => ({ isDesktop: true }))

vi.mock('@client/composables/useDefaultBreakpoints', async () => {
  const { computed } = await import('vue')
  return {
    useDefaultBreakpoints: () => ({
      greaterOrEqual: () => computed(() => mocks.isDesktop),
    }),
  }
})

// Exposes the visibility ref of the most recently mounted grid, so tests can
// scroll it into view and exercise the impression watcher.
const visibility = vi.hoisted(
  () => ({ ref: undefined }) as { ref: Ref<boolean> | undefined },
)

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useElementVisibility: () => {
      visibility.ref = ref(false)
      return visibility.ref
    },
  }
})

const tracking = vi.hoisted(() => ({
  trackSelectItem: vi.fn(),
  trackViewItemList: vi.fn(),
  trackViewProductTile: vi.fn(),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => tracking,
}))

const productCardStub = {
  name: 'SFProductCard',
  props: ['product'],
  emits: ['intersectProduct', 'selectProduct'],
  template:
    '<div data-testid="product-card" :data-product-id="product.id" @click="$emit(\'selectProduct\')" @focus="$emit(\'intersectProduct\')" />',
}

const productSliderStub = {
  name: 'SFProductSlider',
  props: ['products', 'productListId', 'itemListId'],
  template: '<div />',
}

const stubs = {
  SFProductCard: productCardStub,
  SFProductSlider: productSliderStub,
}

const buildProducts = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    createMockListingProduct({ id: index + 1 }),
  )

const mountRecommendations = (count = 6) =>
  mount(SFAddToBasketSlideInRecommendations, {
    props: { products: buildProducts(count) },
    global: { stubs, mocks: { $t: (key: string) => key } },
  })

/** Scrolls the grid into view and lets the watcher flush. */
const scrollGridIntoView = async () => {
  visibility.ref!.value = true
  await nextTick()
}

describe('SFAddToBasketSlideInRecommendations', () => {
  beforeEach(() => {
    mocks.isDesktop = true
  })

  it('renders a grid and no slider on desktop', () => {
    const wrapper = mountRecommendations()

    expect(
      wrapper
        .find('[data-testid="add-to-basket-slide-in-recommendations-grid"]')
        .exists(),
    ).toBe(true)
    expect(
      wrapper
        .find('[data-testid="add-to-basket-slide-in-recommendations-slider"]')
        .exists(),
    ).toBe(false)
  })

  it('renders the product slider and no grid on mobile', () => {
    mocks.isDesktop = false

    const wrapper = mountRecommendations()

    expect(
      wrapper
        .find('[data-testid="add-to-basket-slide-in-recommendations-slider"]')
        .exists(),
    ).toBe(true)
    expect(
      wrapper
        .find('[data-testid="add-to-basket-slide-in-recommendations-grid"]')
        .exists(),
    ).toBe(false)
  })

  it('shows the same leading products in either layout when more are passed than fit', () => {
    const shownIds = mountRecommendations(10)
      .findAll('[data-testid="product-card"]')
      .map((card) => Number(card.attributes('data-product-id')))

    expect(shownIds.length).toBeGreaterThan(0)
    expect(shownIds.length).toBeLessThan(10)
    expect(shownIds).toEqual(
      Array.from({ length: shownIds.length }, (_, index) => index + 1),
    )

    mocks.isDesktop = false

    const sliderProducts: ListingProduct[] = mountRecommendations(10)
      .findComponent(productSliderStub)
      .props('products')
    expect(sliderProducts.map((product) => product.id)).toEqual(shownIds)
  })

  it('reports the rendered list as the trending slider with its own GA4 id once the grid scrolls into view', async () => {
    const wrapper = mountRecommendations(10)
    const renderedCount = wrapper.findAll('[data-testid="product-card"]').length

    expect(tracking.trackViewItemList).not.toHaveBeenCalled()

    await scrollGridIntoView()

    expect(tracking.trackViewItemList).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 })]),
      {
        product_list_type: 'product_slider',
        product_list_id: ProductSliderIds.Trending,
        total: renderedCount,
        itemListSurface: {
          product_list_type: 'product_slider',
          product_list_id: TrackingItemListIds.AddToBasketRecommendations,
        },
      },
    )
    expect(tracking.trackViewItemList.mock.calls[0]![0]).toHaveLength(
      renderedCount,
    )
  })

  it('passes the trending slider id and its own GA4 id to the mobile slider', () => {
    mocks.isDesktop = false

    const slider = mountRecommendations().getComponent(productSliderStub)

    expect(slider.props()).toMatchObject({
      productListId: ProductSliderIds.Trending,
      itemListId: TrackingItemListIds.AddToBasketRecommendations,
    })
  })

  it('reports a tile impression with its one-based position', async () => {
    const wrapper = mountRecommendations()

    await wrapper.findAll('[data-testid="product-card"]')[2]!.trigger('focus')

    expect(tracking.trackViewProductTile).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      expect.objectContaining({
        product_list_id: ProductSliderIds.Trending,
        position: 3,
      }),
    )
  })

  it('reports a select with its one-based index', async () => {
    const wrapper = mountRecommendations()

    await wrapper.findAll('[data-testid="product-card"]')[1]!.trigger('click')

    expect(tracking.trackSelectItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2 }),
      expect.objectContaining({
        index: 2,
        product_list_id: ProductSliderIds.Trending,
        itemListSurface: {
          product_list_type: 'product_slider',
          product_list_id: TrackingItemListIds.AddToBasketRecommendations,
        },
      }),
    )
  })
})
