import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { TypeSingleProductWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { createSafeSuccess } from '@test/utils/orpc'
import SingleProductComponent from './SingleProductComponent.vue'

const mockGetProductsByIds = vi
  .fn()
  .mockResolvedValue(createSafeSuccess([{ id: 101 }]))

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsByIds: mockGetProductsByIds },
  }),
}))

const createContentElement = (
  fields: Partial<{
    product: number
    badge: string
    highUrgency: boolean
  }> = {},
) =>
  ({
    sys: { contentType: { sys: { id: 'singleProduct' } } },
    fields: {
      product: 101,
      badge: 'Staff Pick',
      highUrgency: true,
      ...fields,
    },
  }) as unknown as TypeSingleProductWithoutUnresolvableLinksResponse

const SFSingleProductSpotlightStub = defineComponent({
  name: 'SFSingleProductSpotlight',
  props: ['product', 'badge', 'highUrgency'],
  template: '<div data-testid="spotlight" />',
})

const mountWithSuspense = async (
  contentElement: TypeSingleProductWithoutUnresolvableLinksResponse,
) => {
  const wrapper = mount(
    {
      template:
        '<Suspense><SingleProductComponent :content-element="contentElement" /></Suspense>',
      components: { Suspense, SingleProductComponent },
      setup: () => ({ contentElement }),
    },
    {
      global: {
        stubs: { SFSingleProductSpotlight: SFSingleProductSpotlightStub },
      },
    },
  )
  await flushPromises()
  return wrapper
}

// The fetch, the empty-id skip and the empty-result fallback are tested in
// shared/useCmsSingleProduct.test.ts. These tests cover how the Contentful
// fields map onto the shared composable and the spotlight.
describe('Contentful SingleProductComponent', () => {
  it('fetches the product the Contentful product field names', async () => {
    await mountWithSuspense(createContentElement())

    expect(mockGetProductsByIds).toHaveBeenCalledWith({ ids: [101] })
  })

  it('passes the fetched product and the authored fields to the spotlight', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(
      wrapper.findComponent(SFSingleProductSpotlightStub).props(),
    ).toMatchObject({
      product: { id: 101 },
      badge: 'Staff Pick',
      highUrgency: true,
    })
  })
})
