import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SingleProductComponent as SingleProductComponentType } from '@shared/types/cms/contentstack'
import { createSafeSuccess } from '@test/utils/orpc'
import { vLivePreview } from '../directives/livePreview'
import SingleProductComponent from './SingleProductComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

const mockGetProductsByIds = vi
  .fn()
  .mockResolvedValue(createSafeSuccess([{ id: 101 }]))

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsByIds: mockGetProductsByIds },
  }),
}))

const createContentElement = (
  overrides: Partial<SingleProductComponentType> = {},
): SingleProductComponentType =>
  ({
    _content_type_uid: 'single_product-component',
    title: 'Spotlight',
    product: 101,
    badge: 'Staff Pick',
    high_urgency: true,
    ...overrides,
  }) as SingleProductComponentType

const SFSingleProductSpotlightStub = defineComponent({
  name: 'SFSingleProductSpotlight',
  props: ['product', 'badge', 'highUrgency'],
  template: '<div data-testid="spotlight" :data-badge="badge" />',
})

const mountWithSuspense = async (
  contentElement: SingleProductComponentType,
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
        directives: cmsDirectives,
        stubs: { SFSingleProductSpotlight: SFSingleProductSpotlightStub },
      },
    },
  )
  await flushPromises()
  return wrapper
}

describe('Contentstack SingleProductComponent', () => {
  it('fetches the configured product by id', async () => {
    await mountWithSuspense(createContentElement())

    expect(mockGetProductsByIds).toHaveBeenCalledWith({ ids: [101] })
  })

  it('passes the badge through to the spotlight', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(wrapper.find('[data-badge]').attributes('data-badge')).toBe(
      'Staff Pick',
    )
  })

  it('passes the fetched product to the spotlight', async () => {
    const wrapper = await mountWithSuspense(createContentElement())

    expect(
      wrapper.findComponent(SFSingleProductSpotlightStub).props('product'),
    ).toMatchObject({ id: 101 })
  })
})
