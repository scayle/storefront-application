import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { ANNOUNCE_DEBOUNCE_MS } from '@client/composables/useAnnouncer'
import { createMockListingProduct } from '@test/mock-data/products'
import SFProductSlider from './SFProductSlider.vue'

// Exposes the visibility ref of the most recently mounted slider, so tests
// can drive the container into view and exercise the tracking watcher.
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

// Range announcements route through the shared announcer; assert against the spy
// while keeping the real `ANNOUNCE_DEBOUNCE_MS` export.
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }))
vi.mock('@client/composables/useAnnouncer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/composables/useAnnouncer')>()
  return { ...actual, useAnnouncer: () => ({ announce }) }
})

const tracking = vi.hoisted(() => ({
  trackSelectItem: vi.fn(),
  trackViewItemList: vi.fn(),
  trackViewProductTile: vi.fn(),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => tracking,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'slider.a11y.visible_range' && params) {
        return `Showing items starting at ${params.start} of ${params.total}`
      }
      if (key === 'slider.a11y.skip_to_end') {
        return 'Skip the carousel'
      }
      if (key === 'slider.a11y.skip_to_start') {
        return 'Skip to beginning of the carousel'
      }
      return key
    },
  }),
}))

// The scroll state the item slider hands its arrows slot; a test sets the
// boundaries it needs.
const createItemSliderStub = (
  arrowState = { isPrevEnabled: true, isNextEnabled: true },
) => ({
  name: 'SFItemSlider',
  emits: ['update:activeSlide'],
  setup: () => ({
    arrowSlotProps: {
      ...arrowState,
      prev: () => {},
      next: () => {},
      isScrollable: true,
    },
  }),
  template:
    '<div data-testid="item-slider"><slot name="header" /><slot name="arrows" v-bind="arrowSlotProps" /><ul><slot /></ul></div>',
})

const productCardStub = {
  // `href` so the anchor matches the slider's FOCUSABLE_SELECTOR, standing in
  // for the card's first interactive element. The click stands in for the
  // card's own `selectProduct` emit.
  template:
    '<a href="#" class="product-card-stub" @click.prevent="$emit(\'selectProduct\')">card</a>',
  props: [
    'product',
    'productIndex',
    'disableImageSlider',
    'wishlistInteractionSource',
  ],
  emits: ['intersectProduct', 'selectProduct'],
}

const mountSlider = (
  overrides: Record<string, unknown> = {},
  arrowState?: { isPrevEnabled: boolean; isNextEnabled: boolean },
) => {
  return mount(SFProductSlider, {
    // Attach to the document so `.focus()` / `document.activeElement` work.
    attachTo: document.body,
    props: {
      products: [
        createMockListingProduct({ id: 1 }),
        createMockListingProduct({ id: 2 }),
        createMockListingProduct({ id: 3 }),
      ],
      title: 'Similar products',
      ...overrides,
    },
    global: {
      stubs: {
        SFItemSlider: createItemSliderStub(arrowState),
        SFProductCard: productCardStub,
        IconNavigationLeft: true,
        IconNavigationRight: true,
      },
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) => {
          if (key === 'slider.a11y.visible_range' && params) {
            return `Showing items starting at ${params.start} of ${params.total}`
          }
          if (key === 'slider.a11y.skip_to_end') {
            return 'Skip the carousel'
          }
          if (key === 'slider.a11y.skip_to_start') {
            return 'Skip to beginning of the carousel'
          }
          return key
        },
      },
    },
  })
}

describe('SFProductSlider', () => {
  describe('tracking', () => {
    const sliderSurface = {
      product_list_type: 'product_slider',
      product_list_id: 'similar_products',
      total: 3,
    }

    it('tracks the list once the slider container scrolls into view', async () => {
      mountSlider({ productListId: 'similar_products' })

      expect(tracking.trackViewItemList).not.toHaveBeenCalled()

      visibility.ref!.value = true
      await nextTick()

      expect(tracking.trackViewItemList).toHaveBeenCalledTimes(1)
      expect(tracking.trackViewItemList).toHaveBeenCalledWith(
        [
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
          expect.objectContaining({ id: 3 }),
        ],
        sliderSurface,
      )
      expect(tracking.trackViewProductTile).not.toHaveBeenCalled()
    })

    it('tracks a slider without an id with an absent list id', async () => {
      mountSlider()

      visibility.ref!.value = true
      await nextTick()

      expect(tracking.trackViewItemList).toHaveBeenCalledWith(
        expect.any(Array),
        {
          product_list_type: 'product_slider',
          product_list_id: undefined,
          total: 3,
        },
      )
    })

    it('passes a GA4 list id to the list and select events', async () => {
      const wrapper = mountSlider({
        productListId: 'trending',
        itemListId: 'add_to_basket_recommendations',
      })

      visibility.ref!.value = true
      await nextTick()
      await wrapper.findAll('li a.product-card-stub')[0]!.trigger('click')

      expect(tracking.trackViewItemList).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          product_list_id: 'trending',
          itemListSurface: {
            product_list_type: 'product_slider',
            product_list_id: 'add_to_basket_recommendations',
          },
        }),
      )
      expect(tracking.trackSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({
          product_list_id: 'trending',
          itemListSurface: {
            product_list_type: 'product_slider',
            product_list_id: 'add_to_basket_recommendations',
          },
        }),
      )
    })

    it('tracks a tile when its card intersects, with its position in the slider', () => {
      const wrapper = mountSlider({ productListId: 'similar_products' })

      // The card emits its product id; the slider reads the position from the
      // template index instead, so the payload does not drive the assertion.
      wrapper
        .findAllComponents(productCardStub)[2]!
        .vm.$emit('intersectProduct', 3)

      expect(tracking.trackViewProductTile).toHaveBeenCalledTimes(1)
      expect(tracking.trackViewProductTile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 3 }),
        {
          product_list_type: 'product_slider',
          product_list_id: 'similar_products',
          position: 3,
          total: 3,
        },
      )
    })

    it('tracks a select with the slider surface and a one-based index', async () => {
      const wrapper = mountSlider({ productListId: 'trending' })

      await wrapper.findAll('li a.product-card-stub')[1]!.trigger('click')

      expect(tracking.trackSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2 }),
        {
          index: 2,
          product_list_type: 'product_slider',
          product_list_id: 'trending',
          total: 3,
        },
      )
    })
  })

  it('renders a region labelled by the heading', () => {
    const wrapper = mountSlider()
    const section = wrapper.find('section')
    const heading = wrapper.find('h2')

    expect(heading.text()).toBe('Similar products')
    expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(heading.attributes('id')).toBeTruthy()
  })

  it('names the region with a generic label when the title is empty', () => {
    const wrapper = mountSlider({ title: '' })
    const labelId = wrapper.get('section').attributes('aria-labelledby')

    expect(wrapper.get(`#${labelId}`).text()).toBe('slider.a11y.products_label')
  })

  it('renders cards inside a list (<ul>/<li>) for AT framing', () => {
    const wrapper = mountSlider()
    const list = wrapper.find('ul')
    expect(list.exists()).toBe(true)
    expect(list.findAll('li')).toHaveLength(3)
  })

  it.for([
    {
      arrow: 'previous',
      boundary: 'start',
      arrowState: { isPrevEnabled: false, isNextEnabled: true },
      boundaryArrow: 'slider-arrow-button-left',
      otherArrow: 'slider-arrow-button-right',
    },
    {
      arrow: 'next',
      boundary: 'end',
      arrowState: { isPrevEnabled: true, isNextEnabled: false },
      boundaryArrow: 'slider-arrow-button-right',
      otherArrow: 'slider-arrow-button-left',
    },
  ])(
    'marks the $arrow arrow aria-disabled at the $boundary and keeps it in the Tab order',
    ({ arrowState, boundaryArrow, otherArrow }) => {
      const wrapper = mountSlider({}, arrowState)
      const disabledArrow = wrapper.get<HTMLButtonElement>(
        `[data-testid="${boundaryArrow}"]`,
      )

      expect(disabledArrow.attributes('aria-disabled')).toBe('true')
      expect(
        wrapper
          .get(`[data-testid="${otherArrow}"]`)
          .attributes('aria-disabled'),
      ).toBe('false')
      // `aria-disabled` instead of `disabled` keeps the arrow at the scroll
      // boundary in the Tab order.
      expect(disabledArrow.element.disabled).toBe(false)
      expect(disabledArrow.attributes('tabindex')).toBeUndefined()
    },
  )

  it('labels the prev/next arrows with the product slider translations', () => {
    const wrapper = mountSlider()
    expect(
      wrapper
        .find('[data-testid="slider-arrow-button-left"]')
        .attributes('aria-label'),
    ).toBe('slider.go_to_previous_item')
    expect(
      wrapper
        .find('[data-testid="slider-arrow-button-right"]')
        .attributes('aria-label'),
    ).toBe('slider.go_to_next_item')
  })

  it('announces the visible range when the active slide changes', () => {
    const wrapper = mountSlider()
    // Match SFItemSlider's declared emit name (`update:activeSlide`); kebab-case
    // in templates is only for listeners, not for `$emit` on the stub.
    wrapper
      .findComponent({ name: 'SFItemSlider' })
      .vm.$emit('update:activeSlide', 1)

    expect(announce).toHaveBeenCalledWith('Showing items starting at 2 of 3', {
      debounce: ANNOUNCE_DEBOUNCE_MS,
    })
  })

  it('does not announce on mount so AT does not read the initial position', () => {
    mountSlider()
    expect(announce).not.toHaveBeenCalled()
  })

  it('book-ends the focusable content with two skip-link buttons', () => {
    // The "skip to end" must come first in DOM order (visible content layout
    // gives it pole position as the first interactive element inside the
    // region); "skip to beginning" must be last. Both stay sr-only until
    // focused — that's a CSS class assertion rather than a layout one.
    const wrapper = mountSlider()
    const skipToEnd = wrapper.find('[data-testid="slider-skip-to-end"]')
    const skipToStart = wrapper.find('[data-testid="slider-skip-to-start"]')

    expect(skipToEnd.exists()).toBe(true)
    expect(skipToStart.exists()).toBe(true)
    expect(skipToEnd.classes()).toContain('sr-only')
    expect(skipToStart.classes()).toContain('sr-only')
    expect(skipToEnd.text()).toBe('Skip the carousel')
    expect(skipToStart.text()).toBe('Skip to beginning of the carousel')

    // DOM order: skip-to-end appears before the cards; skip-to-start after.
    const section = wrapper.find('section').element
    const cards = section.querySelectorAll('li')
    const positionVsEnd = skipToEnd.element.compareDocumentPosition(cards[0]!)
    const positionVsStart = skipToStart.element.compareDocumentPosition(
      [...cards].at(-1)!,
    )
    // First card FOLLOWS the skip-to-end → end-button is earlier in DOM.
    expect(positionVsEnd & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Last card PRECEDES the skip-to-start → start-button is later in DOM.
    expect(positionVsStart & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('makes the heading programmatically focusable via tabindex="-1"', () => {
    // Required so "Skip to beginning" has a focus target inside the region
    // without putting the heading in the natural Tab order.
    const wrapper = mountSlider()
    expect(wrapper.find('h2').attributes('tabindex')).toBe('-1')
  })

  it('skips the arrows back to the skip-link on Shift+Tab from the first card (#3)', async () => {
    const wrapper = mountSlider()
    await wrapper
      .find('li a.product-card-stub')
      .trigger('keydown', { key: 'Tab', shiftKey: true })

    expect(document.activeElement).toBe(
      wrapper.find('[data-testid="slider-skip-to-end"]').element,
    )
  })

  it('does not skip the arrows on Shift+Tab from a card other than the first (#3)', async () => {
    const wrapper = mountSlider()
    await wrapper
      .findAll('li a.product-card-stub')[1]!
      .trigger('keydown', { key: 'Tab', shiftKey: true })

    // Only the first card short-circuits to the skip-link; the rest keep the
    // natural (previous card) Tab order.
    expect(document.activeElement).not.toBe(
      wrapper.find('[data-testid="slider-skip-to-end"]').element,
    )
  })
})
