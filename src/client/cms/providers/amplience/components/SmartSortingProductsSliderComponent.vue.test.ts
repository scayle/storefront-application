import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType } from '@shared/types/cms/amplience'
import { createSafeSuccess } from '@test/utils/orpc'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

const mockGetProductsBySmartSorting = vi
  .fn()
  .mockResolvedValue(createSafeSuccess([]))

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsBySmartSorting: mockGetProductsBySmartSorting },
  }),
}))

const createContentElement = (
  overrides: Partial<SmartSortingProductsSliderComponentType> = {},
): SmartSortingProductsSliderComponentType =>
  ({
    _meta: { schema: 'x', deliveryId: 'smart-sorting-slider-1' },
    headline: 'Top Seller Products',
    smart_sorting_key: 'scayle:v1:topseller',
    brand_id: 505,
    category_id: 100,
    limit: 10,
    ...overrides,
  }) as SmartSortingProductsSliderComponentType

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div :data-title="title" :data-count="products.length" />',
})

const mountWithSuspense = async (
  contentElement: SmartSortingProductsSliderComponentType,
) => {
  const wrapper = mount(
    {
      template:
        '<Suspense><SmartSortingProductsSliderComponent :content-element="contentElement" /></Suspense>',
      components: { Suspense, SmartSortingProductsSliderComponent },
      setup: () => ({ contentElement }),
    },
    {
      global: {
        stubs: { SFProductSlider: SFProductSliderStub },
      },
    },
  )
  await flushPromises()
  return wrapper
}

// The missing-key skip, refetch on query change and the failed fetch are tested
// once in shared/useCmsSmartSortingProducts.test.ts. These tests only cover
// which Amplience fields feed the slider.
describe('Amplience SmartSortingProductsSliderComponent', () => {
  it('maps the Amplience fields to the smart sorting query', async () => {
    await mountWithSuspense(createContentElement())

    expect(mockGetProductsBySmartSorting).toHaveBeenCalledWith({
      smartSortingKey: 'scayle:v1:topseller',
      brandId: 505,
      categoryId: 100,
      limit: 10,
    })
  })

  it('shows the fetched products under the headline', async () => {
    mockGetProductsBySmartSorting.mockResolvedValueOnce(
      createSafeSuccess([{ id: 101 }, { id: 102 }]),
    )

    const wrapper = await mountWithSuspense(
      createContentElement({ headline: 'Top Seller Products' }),
    )

    const productSlider = wrapper.findComponent(SFProductSliderStub)
    expect(productSlider.props('title')).toBe('Top Seller Products')
    expect(
      productSlider.props('products').map((p: { id: number }) => p.id),
    ).toEqual([101, 102])
  })
})
