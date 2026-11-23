import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ProductSliderComponent as ProductSliderComponentType } from '@shared/types/cms/amplience'
import { createSafeSuccess } from '@test/utils/orpc'
import ProductSliderComponent from './ProductSliderComponent.vue'

const mockGetProductsByIds = vi.fn().mockResolvedValue(createSafeSuccess([]))

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsByIds: mockGetProductsByIds },
  }),
}))

const createContentElement = (
  overrides: Partial<ProductSliderComponentType> = {},
): ProductSliderComponentType =>
  ({
    _meta: { schema: 'x', deliveryId: 'slider-1' },
    headline: 'Featured Products',
    product_ids: [101, 102],
    ...overrides,
  }) as ProductSliderComponentType

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div :data-title="title" :data-count="products.length" />',
})

const mountWithSuspense = async (
  contentElement: ProductSliderComponentType,
) => {
  const contentElementRef = ref(contentElement)
  const wrapper = mount(
    {
      template:
        '<Suspense><ProductSliderComponent :content-element="contentElement" /></Suspense>',
      components: { Suspense, ProductSliderComponent },
      setup: () => ({ contentElement: contentElementRef }),
    },
    {
      global: {
        stubs: { SFProductSlider: SFProductSliderStub },
      },
    },
  )
  await flushPromises()
  return { wrapper, contentElementRef }
}

// Sorting, refetch rules and the failed fetch are tested once in
// shared/useCmsProductSlider.test.ts. These tests only cover which Amplience
// fields feed the slider.
describe('Amplience ProductSliderComponent', () => {
  it('fetches the authored product_ids and shows the products under the headline', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(
      createSafeSuccess([{ id: 101 }, { id: 102 }]),
    )

    const { wrapper } = await mountWithSuspense(
      createContentElement({
        headline: 'Featured Products',
        product_ids: [101, 102],
      }),
    )

    const productSlider = wrapper.findComponent(SFProductSliderStub)
    expect(mockGetProductsByIds).toHaveBeenCalledWith({ ids: [101, 102] })
    expect(productSlider.props('title')).toBe('Featured Products')
    expect(
      productSlider.props('products').map((p: { id: number }) => p.id),
    ).toEqual([101, 102])
  })

  it('refetches when the editor changes the product_ids in live preview', async () => {
    const { contentElementRef } = await mountWithSuspense(
      createContentElement({ product_ids: [101] }),
    )

    contentElementRef.value = createContentElement({ product_ids: [999] })
    await flushPromises()

    expect(mockGetProductsByIds).toHaveBeenLastCalledWith({ ids: [999] })
  })
})
