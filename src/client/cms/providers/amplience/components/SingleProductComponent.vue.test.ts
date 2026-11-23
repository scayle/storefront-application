import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SingleProductComponent as SingleProductComponentType } from '@shared/types/cms/amplience'
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
  overrides: Partial<SingleProductComponentType> = {},
): SingleProductComponentType =>
  ({
    _meta: { schema: 'x', deliveryId: 'sp-1' },
    product_id: 101,
    badge: 'Staff Pick',
    high_urgency: true,
    ...overrides,
  }) as SingleProductComponentType

const SFSingleProductSpotlightStub = defineComponent({
  name: 'SFSingleProductSpotlight',
  props: [
    'product',
    'badge',
    'highUrgency',
    'backgroundColor',
    'textColor',
    'showCountdown',
    'countdownEndDate',
  ],
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
        stubs: { SFSingleProductSpotlight: SFSingleProductSpotlightStub },
      },
    },
  )

  await flushPromises()
  return wrapper
}

describe('Amplience SingleProductComponent', () => {
  it('resolves the configured product from the snake_case id field', async () => {
    mockGetProductsByIds.mockClear()
    const wrapper = await mountWithSuspense(createContentElement())

    expect(mockGetProductsByIds).toHaveBeenCalledWith({ ids: [101] })
    expect(wrapper.find('[data-testid="spotlight"]').exists()).toBe(true)
  })

  it('forwards the editorial fields to the spotlight', async () => {
    const wrapper = await mountWithSuspense(
      createContentElement({
        background_color: '#000000',
        text_color: '#ffffff',
        show_countdown: true,
        countdown_end_date: '2026-12-24T00:00:00.000Z',
      } as never),
    )

    const spotlight = wrapper.findComponent(SFSingleProductSpotlightStub)

    expect(spotlight.props()).toMatchObject({
      badge: 'Staff Pick',
      highUrgency: true,
      backgroundColor: '#000000',
      textColor: '#ffffff',
      showCountdown: true,
      countdownEndDate: '2026-12-24T00:00:00.000Z',
    })
  })
})
