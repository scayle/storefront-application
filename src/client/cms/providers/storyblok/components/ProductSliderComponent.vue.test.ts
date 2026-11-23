import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ProductSliderComponent as ProductSliderComponentType } from '@shared/types/cms/storyblok'
import { createMockListingProduct } from '@test/mock-data/products'
import { createSafeSuccess } from '@test/utils/orpc'
import { vEditable } from '../directives/editable'
import ProductSliderComponent from './ProductSliderComponent.vue'

const cmsDirectives = { editable: vEditable }

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
    _uid: 'slider-1',
    component: 'ProductSliderComponent',
    title: 'Featured Products',
    products: [{ id: 101 }, { id: 102 }],
    ...overrides,
  }) as ProductSliderComponentType

const SFProductSliderStub = defineComponent({
  name: 'SFProductSlider',
  props: ['title', 'products'],
  template: '<div />',
})

const mountWithSuspense = async (
  contentElement: ProductSliderComponentType,
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
        directives: cmsDirectives,
      },
    },
  )
  await flushPromises()
  return wrapper
}

// Sorting, refetching and the failed-fetch fallback are tested in
// shared/useCmsProductSlider.test.ts. These tests cover how the Storyblok
// fields map onto the shared composable and the slider.
describe('ProductSliderComponent', () => {
  it('passes the title field to the slider', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(wrapper.findComponent(SFProductSliderStub).props('title')).toBe(
      'Featured Products',
    )
  })

  it('fetches the products by the ids of the products field', async () => {
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
