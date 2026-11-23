import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType } from '@shared/types/cms/storyblok'
import { createMockListingProduct } from '@test/mock-data/products'
import { createSafeSuccess } from '@test/utils/orpc'
import { vEditable } from '../directives/editable'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

const cmsDirectives = { editable: vEditable }

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
    _uid: 'smart-sorting-slider-1',
    component: 'SmartSortingProductsSliderComponent',
    title: 'Top Seller Products',
    smartSortingKey: 'scayle:v1:topseller',
    brandId: '505',
    categoryId: '100',
    limit: '10',
    ...overrides,
  }) as SmartSortingProductsSliderComponentType

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div />',
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
        stubs: { SFProductSlider: SFProductSliderStub },
        directives: cmsDirectives,
      },
    },
  )
  await flushPromises()
  return wrapper
}

// The missing-key skip, refetching and the failed-fetch fallback are tested in
// shared/useCmsSmartSortingProducts.test.ts. These tests cover how the
// Storyblok fields map onto the shared composable and the slider.
describe('SmartSortingProductsSliderComponent', () => {
  it('passes the title field to the slider', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(wrapper.findComponent(SFProductSliderStub).props('title')).toBe(
      'Top Seller Products',
    )
  })

  it('fetches products with the smart sorting fields parsed to numbers', async () => {
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
    const sliderClasses = async (title: string | undefined) =>
      (await mountWithSuspense(createContentElement({ title })))
        .findComponent(SFProductSliderStub)
        .classes()

    const withTitle = await sliderClasses('Top Seller Products')
    const withoutTitle = await sliderClasses(undefined)

    expect(withoutTitle.filter((c) => !withTitle.includes(c))).not.toEqual([])
  })
})
