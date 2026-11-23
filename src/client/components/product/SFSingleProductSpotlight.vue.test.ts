import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { createMockListingProduct } from '@test/mock-data/products'
import type { ProductCardHighlightOverride } from './productCardHighlight'
import SFSingleProductSpotlight from './SFSingleProductSpotlight.vue'

const product = createMockListingProduct({ id: 42, name: 'Spotlight Tee' })

const { trackSelectItem, trackViewItemList, trackViewProductTile } = vi.hoisted(
  () => ({
    trackSelectItem: vi.fn(),
    trackViewItemList: vi.fn(),
    trackViewProductTile: vi.fn(),
  }),
)

const spotlightSurface = { product_list_type: 'product_slider', total: 1 }

// Exposes the visibility ref of the most recently mounted spotlight, so tests
// can drive the element into view and exercise the `trackViewItemList` watcher.
// Each mount gets its own ref so a still-mounted component from a prior test
// does not react to a later test flipping visibility.
const visibility = vi.hoisted(
  () => ({ ref: undefined }) as { ref: Ref<boolean> | undefined },
)

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useElementVisibility: () => {
      visibility.ref = ref(false)
      return visibility.ref
    },
  }
})

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => ({
    trackSelectItem,
    trackViewItemList,
    trackViewProductTile,
  }),
}))

const SFProductCardStub = defineComponent({
  name: 'SFProductCard',
  props: ['product', 'productIndex', 'highlightOverride'],
  emits: ['selectProduct'],
  template:
    '<button data-testid="product-card" @click="$emit(\'selectProduct\')" />',
})

const futureDate = '2099-01-01T00:00:00.000Z'

const mountSpotlight = (
  props: Partial<InstanceType<typeof SFSingleProductSpotlight>['$props']> = {},
) => {
  const wrapper = mount(SFSingleProductSpotlight, {
    props: { product, ...props },
    global: { stubs: { SFProductCard: SFProductCardStub } },
  })
  return { wrapper, card: wrapper.findComponent(SFProductCardStub) }
}

const highlightOverrideOf = (
  card: ReturnType<typeof mountSpotlight>['card'],
): ProductCardHighlightOverride | undefined =>
  card.props('highlightOverride') as ProductCardHighlightOverride | undefined

describe('SFSingleProductSpotlight', () => {
  afterEach(() => {
    vi.clearAllMocks()
    if (visibility.ref) {
      visibility.ref.value = false
    }
  })

  it('tracks a view_item_list event once the spotlight scrolls into view', async () => {
    mountSpotlight()

    expect(trackViewItemList).not.toHaveBeenCalled()

    visibility.ref!.value = true
    await nextTick()

    expect(trackViewItemList).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 42 })],
      spotlightSurface,
    )
    expect(trackViewProductTile).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      { ...spotlightSurface, position: 1 },
    )
  })

  it('does not track a view when there is no product to spotlight', async () => {
    mount(SFSingleProductSpotlight, {
      props: { product: undefined },
      global: { stubs: { SFProductCard: SFProductCardStub } },
    })

    visibility.ref!.value = true
    await nextTick()

    expect(trackViewItemList).not.toHaveBeenCalled()
  })

  it('renders SFProductCard with the product', () => {
    const { card } = mountSpotlight()

    expect(card.exists()).toBe(true)
    expect(card.props('product')).toMatchObject({ id: 42 })
  })

  it('forwards spotlight tracking to SFProductCard', () => {
    const { card } = mountSpotlight()

    expect(card.props('productIndex')).toBe(0)

    card.trigger('click')

    expect(trackSelectItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      { index: 1, ...spotlightSurface },
    )
  })

  it('renders nothing when no product is provided', () => {
    const wrapper = mount(SFSingleProductSpotlight, {
      props: { product: undefined },
      global: { stubs: { SFProductCard: SFProductCardStub } },
    })

    expect(wrapper.findComponent(SFProductCardStub).exists()).toBe(false)
  })

  it('passes no highlight promotion in the normal (non-urgency) state', () => {
    expect(highlightOverrideOf(mountSpotlight().card)).toBeUndefined()

    // Even with colors/countdown set, nothing highlights unless highUrgency is on.
    expect(
      highlightOverrideOf(
        mountSpotlight({
          backgroundColor: '#000',
          showCountdown: true,
          countdownEndDate: futureDate,
        }).card,
      ),
    ).toBeUndefined()
  })

  it.for([
    {
      name: 'the configured colors',
      props: {
        backgroundColor: 'rgb(0, 0, 0)',
        textColor: 'rgb(255, 255, 255)',
      },
      expected: {
        color: {
          backgroundColor: 'rgb(0, 0, 0)',
          color: 'rgb(255, 255, 255)',
        },
        badgeLabel: undefined,
        countdownEndDate: undefined,
      },
    },
    {
      name: 'only the valid CMS colors',
      props: { backgroundColor: 'not-a-color', textColor: '#ffffff' },
      expected: {
        color: { backgroundColor: undefined, color: '#ffffff' },
        badgeLabel: undefined,
        countdownEndDate: undefined,
      },
    },
    {
      name: 'the badge label',
      props: { badge: 'Staff Pick' },
      expected: {
        color: undefined,
        badgeLabel: 'Staff Pick',
        countdownEndDate: undefined,
      },
    },
    {
      name: 'the countdown end date when showCountdown is on',
      props: { showCountdown: true, countdownEndDate: futureDate },
      expected: {
        color: undefined,
        badgeLabel: undefined,
        countdownEndDate: futureDate,
      },
    },
    {
      name: 'no countdown end date when showCountdown is off',
      props: { showCountdown: false, countdownEndDate: futureDate },
      expected: {
        color: undefined,
        badgeLabel: undefined,
        countdownEndDate: undefined,
      },
    },
  ])(
    'passes $name to the highlight in the high-urgency state',
    ({ props, expected }) => {
      const { card } = mountSpotlight({ highUrgency: true, ...props })

      expect(highlightOverrideOf(card)).toEqual(expected)
    },
  )
})
