import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { TypeProductSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { createMockListingProduct } from '@test/mock-data/products'
import { createSafeSuccess } from '@test/utils/orpc'
import ProductSliderComponent from './ProductSliderComponent.vue'

const mockGetProductsByIds = vi.fn().mockResolvedValue(createSafeSuccess([]))

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsByIds: mockGetProductsByIds },
  }),
}))

const createContentElement = (
  fields: Partial<{ title: string; products: Array<{ id: number }> }> = {},
) =>
  ({
    sys: { contentType: { sys: { id: 'productSliderComponent' } } },
    fields: {
      title: 'Featured Products',
      products: [{ id: 101 }, { id: 102 }],
      ...fields,
    },
  }) as unknown as TypeProductSliderComponentWithoutUnresolvableLinksResponse

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div :data-title="title" />',
})

const mountWithSuspense = async (
  contentElement: TypeProductSliderComponentWithoutUnresolvableLinksResponse,
) => {
  const wrapper = mount(
    {
      template:
        '<Suspense><ProductSliderComponent :content-element="contentElement" /></Suspense>',
      components: { Suspense, ProductSliderComponent },
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

// Sorting, refetching and the failed-fetch fallback are tested in
// shared/useCmsProductSlider.test.ts. These tests cover how the Contentful
// fields map onto the shared composable and the slider.
describe('ProductSliderComponent', () => {
  it('renders the title from contentElement.fields', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(wrapper.find('[data-title]').attributes('data-title')).toBe(
      'Featured Products',
    )
  })

  it('fetches products by IDs on mount', async () => {
    await mountWithSuspense(createContentElement())

    expect(mockGetProductsByIds).toHaveBeenCalledWith({
      ids: [101, 102],
    })
  })

  it('passes the fetched products to the slider', async () => {
    const fetched = [
      createMockListingProduct({ id: 101 }),
      createMockListingProduct({ id: 102 }),
    ]
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess(fetched))

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
