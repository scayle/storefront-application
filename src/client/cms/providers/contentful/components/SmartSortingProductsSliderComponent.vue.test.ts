import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { createMockListingProduct } from '@test/mock-data/products'
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
  fields: Partial<{
    title: string
    smartSortingKey: TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse['fields']['smartSortingKey']
    brandId: number
    categoryId: number
    limit: number
  }> = {},
) =>
  ({
    sys: {
      contentType: { sys: { id: 'smartSortingProductsSliderComponent' } },
    },
    fields: {
      title: 'Featured Products',
      smartSortingKey: 'Topseller',
      brandId: 42,
      categoryId: 7,
      limit: 6,
      ...fields,
    },
  }) as unknown as TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div :data-title="title" />',
})

const mountWithSuspense = async (
  contentElement: TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse,
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
      },
    },
  )
  await flushPromises()
  return wrapper
}

// The fetch, the missing-key skip, refetching and the failed-fetch fallback
// are tested in shared/useCmsSmartSortingProducts.test.ts. These tests cover
// how the Contentful fields map onto the query and the slider.
describe('SmartSortingProductsSliderComponent', () => {
  it('renders the title from contentElement.fields', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(wrapper.find('[data-title]').attributes('data-title')).toBe(
      'Featured Products',
    )
  })

  it('fetches products by smart sorting on mount', async () => {
    await mountWithSuspense(createContentElement())

    expect(mockGetProductsBySmartSorting).toHaveBeenCalledWith({
      smartSortingKey: 'scayle:v1:topseller',
      brandId: 42,
      categoryId: 7,
      limit: 6,
    })
  })

  it('requests ten products when the author set no limit', async () => {
    await mountWithSuspense(createContentElement({ limit: undefined }))

    expect(mockGetProductsBySmartSorting).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    )
  })

  it('passes the fetched products to the slider', async () => {
    const fetched = [
      createMockListingProduct({ id: 101 }),
      createMockListingProduct({ id: 102 }),
    ]
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

    const withTitle = await sliderClasses('Featured Products')
    const withoutTitle = await sliderClasses(undefined)

    expect(withoutTitle.filter((c) => !withTitle.includes(c))).not.toEqual([])
  })
})
