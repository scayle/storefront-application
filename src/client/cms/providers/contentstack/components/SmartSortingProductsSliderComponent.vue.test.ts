import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType } from '@shared/types/cms/contentstack'
import { createMockListingProduct } from '@test/mock-data/products'
import { createSafeSuccess } from '@test/utils/orpc'
import { vLivePreview } from '../directives/livePreview'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

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
    uid: 'smart-sorting-slider-1',
    _content_type_uid: 'smart_sorting_products_slider-component',
    title: 'Top sellers entry',
    display_title: 'Top Seller Products',
    smart_sorting_key: 'scayle:v1:topseller',
    brand_id: 505,
    category_id: 100,
    limit: 10,
    ...overrides,
  }) as SmartSortingProductsSliderComponentType

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div :data-title="title" />',
})

const mountWithSuspense = async (
  contentElement: SmartSortingProductsSliderComponentType,
) => {
  const wrapper = mount(
    {
      template:
        '<Suspense><SmartSortingProductsSliderComponent :content-element="contentElement" /></Suspense>',
      components: { Suspense, SmartSortingProductsSliderComponent },
      setup() {
        return { contentElement }
      },
    },
    {
      global: {
        directives: cmsDirectives,
        stubs: { SFProductSlider: SFProductSliderStub },
      },
    },
  )
  await flushPromises()
  return wrapper
}

// The missing-key skip, refetching and the failed-fetch fallback are tested in
// shared/useCmsSmartSortingProducts.test.ts. These tests cover how the
// Contentstack fields map onto the shared composable and the slider.
describe('SmartSortingProductsSliderComponent', () => {
  it('passes the display title to the slider', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(wrapper.findComponent(SFProductSliderStub).props('title')).toBe(
      'Top Seller Products',
    )
  })

  it('fetches products with the smart sorting fields', async () => {
    await mountWithSuspense(createContentElement())

    expect(mockGetProductsBySmartSorting).toHaveBeenCalledWith({
      smartSortingKey: 'scayle:v1:topseller',
      brandId: 505,
      categoryId: 100,
      limit: 10,
    })
  })

  it('passes the fetched products to the slider', async () => {
    const fetched = [createMockListingProduct({ id: 101 })]
    mockGetProductsBySmartSorting.mockResolvedValueOnce(
      createSafeSuccess(fetched),
    )

    const wrapper = await mountWithSuspense(createContentElement())

    expect(
      wrapper.findComponent(SFProductSliderStub).props('products'),
    ).toEqual(fetched)
  })

  it('adds top spacing in place of a missing title', async () => {
    const sliderClasses = async (
      overrides: Partial<SmartSortingProductsSliderComponentType>,
    ) =>
      (await mountWithSuspense(createContentElement(overrides)))
        .findComponent(SFProductSliderStub)
        .classes()

    const withTitle = await sliderClasses({})
    const withoutTitle = await sliderClasses({
      title: undefined,
      display_title: undefined,
    })

    expect(withoutTitle.filter((c) => !withTitle.includes(c))).not.toEqual([])
  })
})
