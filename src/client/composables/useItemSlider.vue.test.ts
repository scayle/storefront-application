import type { Ref } from 'vue'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useItemsSlider } from './useItemSlider'

const observers = vi.hoisted(() => ({
  onResize: null as (() => void) | null,
  onMutation: null as (() => void) | null,
}))

// The composable reads layout metrics inside the resize callback and child
// counts inside the mutation callback. happy-dom fires neither observer, so
// the callbacks are captured here and invoked from the tests instead.
vi.mock('@vueuse/core', async () => {
  const actual =
    await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')

  return {
    ...actual,
    useResizeObserver: vi.fn((_target: unknown, callback: () => void) => {
      observers.onResize = callback
      return { stop: vi.fn(), isSupported: ref(true) }
    }),
    useMutationObserver: vi.fn((_target: unknown, callback: () => void) => {
      observers.onMutation = callback
      return { stop: vi.fn(), isSupported: ref(true) }
    }),
  }
})

type LayoutMetric =
  | 'scrollWidth'
  | 'clientWidth'
  | 'scrollHeight'
  | 'clientHeight'
  | 'offsetWidth'
  | 'offsetHeight'
  | 'scrollLeft'
  | 'scrollTop'

/**
 * happy-dom reports 0 for every layout metric and does not lay elements out,
 * so each test states the geometry the composable should read.
 */
function setLayout(
  element: HTMLElement,
  metrics: Partial<Record<LayoutMetric, number>>,
) {
  for (const [name, value] of Object.entries(metrics)) {
    Object.defineProperty(element, name, {
      value,
      configurable: true,
      writable: true,
    })
  }
}

function mountSlider({
  mode = 'horizontal' as 'horizontal' | 'vertical',
  slideCount = ref(3),
  withElement = true,
} = {}) {
  let slider!: ReturnType<typeof useItemsSlider>

  const wrapper = mount(
    defineComponent({
      setup() {
        const sliderRef = ref<HTMLElement>()
        slider = useItemsSlider(sliderRef as Ref<HTMLElement>, mode)
        return { sliderRef, slideCount }
      },
      template: withElement
        ? `<div ref="sliderRef"><div v-for="index in slideCount" :key="index" /></div>`
        : `<div />`,
    }),
  )

  const element = wrapper.element as HTMLElement
  const scrollTo = vi.fn()
  Object.defineProperty(element, 'scrollTo', {
    value: scrollTo,
    configurable: true,
    writable: true,
  })

  return { wrapper, slider, element, scrollTo }
}

describe('useItemsSlider', () => {
  beforeEach(() => {
    observers.onResize = null
    observers.onMutation = null
  })

  describe('slide size derivation', () => {
    it.for([
      {
        label:
          'forward by the slide width derived from scrollWidth and the child count',
        mode: 'horizontal' as const,
        scrollPosition: 0,
        action: 'next' as const,
        offset: undefined,
        expected: { top: 0, left: 300 },
      },
      {
        label: 'forward with the offset argument added to the target position',
        mode: 'horizontal' as const,
        scrollPosition: 0,
        action: 'next' as const,
        offset: 24,
        expected: { top: 0, left: 324 },
      },
      {
        label:
          'forward by the slide height derived from scrollHeight in vertical mode',
        mode: 'vertical' as const,
        scrollPosition: 0,
        action: 'next' as const,
        offset: undefined,
        expected: { top: 300, left: 0 },
      },
      {
        label: 'back by one slide width',
        mode: 'horizontal' as const,
        scrollPosition: 600,
        action: 'prev' as const,
        offset: undefined,
        expected: { top: 0, left: 300 },
      },
      {
        label: 'back by one slide height in vertical mode',
        mode: 'vertical' as const,
        scrollPosition: 600,
        action: 'prev' as const,
        offset: undefined,
        expected: { top: 300, left: 0 },
      },
    ])(
      'scrolls $label',
      async ({ mode, scrollPosition, action, offset, expected }) => {
        const { slider, element, scrollTo } = mountSlider({ mode })
        setLayout(
          element,
          mode === 'horizontal'
            ? {
                scrollWidth: 900,
                clientWidth: 300,
                scrollLeft: scrollPosition,
              }
            : {
                scrollHeight: 900,
                clientHeight: 300,
                scrollTop: scrollPosition,
              },
        )

        await slider.onScroll()
        slider[action](offset)

        expect(scrollTo).toHaveBeenCalledWith({
          ...expected,
          behavior: 'smooth',
        })
      },
    )
  })

  describe('scroll arrival boundaries', () => {
    it('keeps forward navigation available while the right edge is further away than the threshold', async () => {
      const { slider, element } = mountSlider()
      // 598 + 300 = 898, one pixel short of the 899 arrival point.
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 598,
      })

      await slider.onScroll()

      expect(slider.isNextEnabled.value).toBe(true)
    })

    it('reports arrival at the right edge within the 1px threshold', async () => {
      const { slider, element, scrollTo } = mountSlider()
      // 599 + 300 = 899, which is scrollWidth minus the 1px threshold.
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 599,
      })

      await slider.onScroll()

      expect(slider.isNextEnabled.value).toBe(false)
      slider.next()
      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('reports arrival at the left edge only at scrollLeft 0', async () => {
      const { slider, element, scrollTo } = mountSlider()
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 0,
      })

      await slider.onScroll()
      expect(slider.isPrevEnabled.value).toBe(false)
      slider.prev()
      expect(scrollTo).not.toHaveBeenCalled()

      setLayout(element, { scrollLeft: 1 })
      await slider.onScroll()

      expect(slider.isPrevEnabled.value).toBe(true)
    })

    it('reports arrival at the bottom edge within the 1px threshold', async () => {
      const { slider, element } = mountSlider({ mode: 'vertical' })
      setLayout(element, {
        scrollHeight: 900,
        clientHeight: 300,
        scrollTop: 598,
      })

      await slider.onScroll()
      expect(slider.isNextEnabled.value).toBe(true)

      setLayout(element, { scrollTop: 599 })
      await slider.onScroll()

      expect(slider.isNextEnabled.value).toBe(false)
    })

    it('reports arrival at the top edge only at scrollTop 0', async () => {
      const { slider, element } = mountSlider({ mode: 'vertical' })
      setLayout(element, {
        scrollHeight: 900,
        clientHeight: 300,
        scrollTop: 0,
      })

      await slider.onScroll()
      expect(slider.isPrevEnabled.value).toBe(false)

      setLayout(element, { scrollTop: 1 })
      await slider.onScroll()

      expect(slider.isPrevEnabled.value).toBe(true)
    })
  })

  describe('active slide index', () => {
    it('rounds the horizontal scroll position to the nearest slide', async () => {
      const { slider, element } = mountSlider()
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 0,
      })

      await slider.onScroll()
      expect(slider.activeSlide.value).toBe(0)

      setLayout(element, { scrollLeft: 300 })
      await slider.onScroll()
      expect(slider.activeSlide.value).toBe(1)

      setLayout(element, { scrollLeft: 600 })
      await slider.onScroll()
      expect(slider.activeSlide.value).toBe(2)
    })

    it('stays on the current slide until the scroll passes the half-slide mark', async () => {
      const { slider, element } = mountSlider()
      // 149 / 300 rounds down, 150 / 300 rounds up.
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 150,
      })

      await slider.onScroll()
      expect(slider.activeSlide.value).toBe(0)

      setLayout(element, { scrollLeft: 151 })
      await slider.onScroll()

      expect(slider.activeSlide.value).toBe(1)
    })

    it('rounds the vertical scroll position to the nearest slide', async () => {
      const { slider, element } = mountSlider({ mode: 'vertical' })
      setLayout(element, {
        scrollHeight: 900,
        clientHeight: 300,
        scrollTop: 600,
      })

      await slider.onScroll()

      expect(slider.activeSlide.value).toBe(2)
    })
  })

  describe('throttled scroll handling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('applies the first scroll of a throttle window immediately', async () => {
      const { slider, element } = mountSlider()
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 300,
      })

      await slider.onScroll()

      expect(slider.activeSlide.value).toBe(1)
    })

    it('defers a second scroll within the throttle window until the window closes', async () => {
      const { slider, element } = mountSlider()
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 0,
      })
      await slider.onScroll()

      setLayout(element, { scrollLeft: 600 })
      const pending = slider.onScroll()

      expect(slider.activeSlide.value).toBe(0)

      await vi.advanceTimersByTimeAsync(100)
      await pending

      expect(slider.activeSlide.value).toBe(2)
    })
  })

  describe('scrollImageIntoView', () => {
    it('scrolls to the offset width times the index, without animation by default', () => {
      const { slider, element, scrollTo } = mountSlider()
      setLayout(element, { offsetWidth: 320 })

      slider.scrollImageIntoView(2)

      expect(scrollTo).toHaveBeenCalledWith({ left: 640, behavior: 'auto' })
    })

    it('forwards the requested scroll behavior', () => {
      const { slider, element, scrollTo } = mountSlider()
      setLayout(element, { offsetWidth: 320 })

      slider.scrollImageIntoView(1, 'smooth')

      expect(scrollTo).toHaveBeenCalledWith({ left: 320, behavior: 'smooth' })
    })

    it('scrolls to the offset height times the index in vertical mode', () => {
      const { slider, element, scrollTo } = mountSlider({ mode: 'vertical' })
      setLayout(element, { offsetHeight: 480 })

      slider.scrollImageIntoView(1)

      expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'auto' })
    })
  })

  describe('isScrollable', () => {
    it('is false until the resize observer reports the layout', () => {
      const { slider, element } = mountSlider()
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollLeft: 0,
      })

      expect(slider.isScrollable.value).toBe(false)

      observers.onResize?.()

      expect(slider.isScrollable.value).toBe(true)
    })

    it('is false when the content fits the viewport', () => {
      const { slider, element } = mountSlider()
      setLayout(element, {
        scrollWidth: 300,
        clientWidth: 300,
        scrollLeft: 0,
      })

      observers.onResize?.()

      expect(slider.isScrollable.value).toBe(false)
    })

    it('compares the heights in vertical mode', () => {
      const { slider, element } = mountSlider({ mode: 'vertical' })
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 300,
        scrollHeight: 300,
        clientHeight: 300,
        scrollTop: 0,
      })

      observers.onResize?.()
      expect(slider.isScrollable.value).toBe(false)

      setLayout(element, { scrollHeight: 900 })
      observers.onResize?.()

      expect(slider.isScrollable.value).toBe(true)
    })

    it('recomputes the arrival state when the element resizes', () => {
      const { slider, element } = mountSlider()
      setLayout(element, {
        scrollWidth: 900,
        clientWidth: 900,
        scrollLeft: 0,
      })

      observers.onResize?.()

      expect(slider.isNextEnabled.value).toBe(false)
    })
  })

  describe('itemSize', () => {
    it('reports the child count on mount', () => {
      const { slider } = mountSlider()

      expect(slider.itemSize.value).toBe(3)
    })

    it('reports 0 for a slider without children', () => {
      const { slider } = mountSlider({ slideCount: ref(0) })

      expect(slider.itemSize.value).toBe(0)
    })

    it('updates the child count when the mutation observer fires', async () => {
      const slideCount = ref(3)
      const { slider } = mountSlider({ slideCount })
      expect(slider.itemSize.value).toBe(3)

      slideCount.value = 5
      await nextTick()
      observers.onMutation?.()

      expect(slider.itemSize.value).toBe(5)
    })
  })

  describe('without a slider element', () => {
    it('leaves every method inert and reports no scrollable state', async () => {
      const { slider } = mountSlider({ withElement: false })

      await expect(slider.onScroll()).resolves.not.toThrow()
      expect(() => slider.next()).not.toThrow()
      expect(() => slider.prev()).not.toThrow()
      expect(() => slider.scrollImageIntoView(2)).not.toThrow()
      expect(slider.isScrollable.value).toBeUndefined()
      expect(slider.itemSize.value).toBe(0)
      expect(slider.activeSlide.value).toBe(0)
    })
  })
})
