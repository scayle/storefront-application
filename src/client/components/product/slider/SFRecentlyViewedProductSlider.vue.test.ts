import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMockListingProduct } from '../../../../test/mock-data/products'
import SFRecentlyViewedProductSlider from './SFRecentlyViewedProductSlider.vue'

const mockLoadMissingProducts = vi.fn()
const mockProducts = ref<ReturnType<typeof createMockListingProduct>[]>([])

vi.mock('@client/composables/useRecentlyViewedProducts', () => ({
  useRecentlyViewedProducts: () => ({
    loadMissingProducts: mockLoadMissingProducts,
    products: mockProducts,
  }),
}))

const sliderStub = {
  template:
    '<div data-testid="recently-viewed-products-slider" :data-title="title" :data-product-list-id="productListId" />',
  props: ['title', 'products', 'productListId'],
}

describe('SFRecentlyViewedProductSlider', () => {
  it('calls loadMissingProducts on mount even when there are no products', () => {
    mockLoadMissingProducts.mockClear()
    mockProducts.value = []

    mount(SFRecentlyViewedProductSlider, {
      global: {
        stubs: { SFProductSlider: sliderStub },
        mocks: { $t: (key: string) => key },
      },
    })

    expect(mockLoadMissingProducts).toHaveBeenCalledOnce()
  })

  it('does not render the slider when there are no products', () => {
    mockProducts.value = []

    const wrapper = mount(SFRecentlyViewedProductSlider, {
      global: {
        stubs: { SFProductSlider: sliderStub },
        mocks: { $t: (key: string) => key },
      },
    })

    expect(
      wrapper.find('[data-testid="recently-viewed-products-slider"]').exists(),
    ).toBe(false)
  })

  it('passes the translated title, tracking list name and slider id to SFProductSlider when products exist', () => {
    mockProducts.value = [createMockListingProduct({ id: 1 })]

    const wrapper = mount(SFRecentlyViewedProductSlider, {
      global: {
        stubs: { SFProductSlider: sliderStub },
        mocks: { $t: (key: string) => key },
      },
    })

    const slider = wrapper.find(
      '[data-testid="recently-viewed-products-slider"]',
    )
    expect(slider.exists()).toBe(true)
    expect(slider.attributes('data-title')).toBe(
      'recentlyViewedProductsSlider.title',
    )
    expect(slider.attributes('data-product-list-id')).toBe('recently_viewed')
  })
})
