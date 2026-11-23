import type { MaybeRef, Ref } from 'vue'
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  toValue,
} from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from '@vueuse/core'
import { useDrag, usePinch } from '@vueuse/gesture'
import type { GallerySliderScrollController } from './useGalleryZoom'
import { useGalleryZoom } from './useGalleryZoom'

const mockPinchController = {
  clean: vi.fn(),
  bind: vi.fn(),
  reset: vi.fn(),
}

const mockDragController = {
  clean: vi.fn(),
  bind: vi.fn(),
  reset: vi.fn(),
}

vi.mock('@vueuse/gesture', () => ({
  usePinch: vi.fn(() => mockPinchController),
  useDrag: vi.fn(() => mockDragController),
}))

// Only `useMediaQuery` is mocked. The real `useMounted` keeps the SSR gate
// under test: `isTouchSupported` stays `false` until the component mounts,
// so the first client render matches the server one.
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useMediaQuery: vi.fn(() => ref(false)),
  }
})

describe('useGalleryZoom', () => {
  beforeEach(() => {
    // Default to a non-touch (desktop) pointer; touch cases override this.
    vi.mocked(useMediaQuery).mockReturnValue(computed(() => false))
  })

  /**
   * A slide element with the `<picture>` box the pan bounds are derived from.
   * happy-dom lays nothing out, so both dimensions are stated here.
   */
  function createSlide({ width = 450, height = 800 } = {}) {
    const slide = document.createElement('div')
    const picture = document.createElement('picture')
    Object.defineProperty(picture, 'clientWidth', {
      value: width,
      configurable: true,
    })
    Object.defineProperty(picture, 'clientHeight', {
      value: height,
      configurable: true,
    })
    slide.appendChild(picture)
    return slide
  }

  function setupGallery({
    startIndex = ref(0) as MaybeRef<number>,
    slides = [createSlide(), createSlide()],
  } = {}) {
    const visible = ref(false)
    const scrollImageIntoView = vi.fn()
    let zoom!: ReturnType<typeof useGalleryZoom>
    const Host = defineComponent({
      setup() {
        zoom = useGalleryZoom(
          visible,
          startIndex,
          ref({
            scrollImageIntoView,
          }) as Ref<GallerySliderScrollController | undefined>,
          ref(slides) as Ref<HTMLDivElement[] | undefined>,
        )
        return () => h('div')
      },
    })
    const wrapper = mount(Host)

    return { wrapper, visible, zoom, scrollImageIntoView }
  }

  /** The visible watcher defers the gesture binding to `nextTick`. */
  async function show(visible: Ref<boolean>) {
    visible.value = true
    await nextTick()
    await nextTick()
  }

  function getPinchHandler() {
    return vi.mocked(usePinch).mock.calls[0]![0] as unknown as (event: {
      offset: [number, number]
      pinching: boolean
    }) => void
  }

  function getDragHandler() {
    return vi.mocked(useDrag).mock.calls[0]![0] as unknown as (event: {
      dragging: boolean
      delta: [number, number]
    }) => void
  }

  /**
   * The gesture options each controller was constructed with. VueUse types the
   * second argument as a union with an empty object, so the shape the
   * composable passes is narrowed here.
   */
  interface GestureConfig {
    domTarget: MaybeRef<HTMLDivElement | undefined>
    eventOptions: { passive: boolean }
  }

  function getPinchConfig() {
    return vi.mocked(usePinch).mock.calls[0]![1] as GestureConfig
  }

  function getDragConfig() {
    return vi.mocked(useDrag).mock.calls[0]![1] as GestureConfig
  }

  describe('isTouchSupported', () => {
    it('keeps touch detection off until the component mounts so the first render matches SSR', () => {
      vi.mocked(useMediaQuery).mockReturnValue(computed(() => true))
      const duringSetup: boolean[] = []
      const afterMount: boolean[] = []
      const Host = defineComponent({
        setup() {
          const { isTouchSupported } = useGalleryZoom(
            ref(false),
            0,
            ref(undefined) as Ref<GallerySliderScrollController | undefined>,
            ref(undefined) as Ref<HTMLDivElement[] | undefined>,
          )
          duringSetup.push(isTouchSupported.value)
          onMounted(() => afterMount.push(isTouchSupported.value))
          return () => h('div')
        },
      })

      mount(Host)

      expect(duringSetup[0]).toBe(false)
      expect(afterMount[0]).toBe(true)
    })
  })

  describe('toggleDoubleZoom', () => {
    it('sets the zoom offsets from the event when zooming in on desktop', () => {
      const { zoom } = setupGallery()

      zoom.toggleDoubleZoom({ offsetX: 100, offsetY: 80 } as MouseEvent)

      expect(zoom.scale.value).toBe(1.5)
      expect(zoom.zoomOffsetX.value).toBe(100)
      expect(zoom.zoomOffsetY.value).toBe(80)
    })

    it('zooms out to 1 but keeps the offset on desktop (origin stays put)', () => {
      const { zoom } = setupGallery()

      zoom.toggleDoubleZoom({ offsetX: 50, offsetY: 50 } as MouseEvent)
      expect(zoom.scale.value).toBe(1.5)
      expect(zoom.zoomOffsetX.value).toBe(50)
      expect(zoom.zoomOffsetY.value).toBe(50)

      zoom.toggleDoubleZoom({ offsetX: 0, offsetY: 0 } as MouseEvent)
      expect(zoom.scale.value).toBe(1)
      expect(zoom.zoomOffsetX.value).toBe(50)
      expect(zoom.zoomOffsetY.value).toBe(50)
    })

    it('zooms out to 1 and resets the offsets on touch (translate path)', () => {
      vi.mocked(useMediaQuery).mockReturnValue(computed(() => true))
      const { zoom } = setupGallery()

      expect(zoom.isTouchSupported.value).toBe(true)
      zoom.scale.value = 2
      zoom.zoomOffsetX.value = 30
      zoom.zoomOffsetY.value = 20

      zoom.toggleDoubleZoom()
      expect(zoom.scale.value).toBe(1)
      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })
  })

  describe('updateZoomOffset', () => {
    it('does nothing when the scale is 1 or less', () => {
      const { zoom } = setupGallery()

      zoom.updateZoomOffset({ offsetX: 100, offsetY: 80 } as MouseEvent)

      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })

    it('sets the offsets from the event when the scale is above 1 on desktop', () => {
      const { zoom } = setupGallery()

      zoom.toggleDoubleZoom({ offsetX: 0, offsetY: 0 } as MouseEvent)
      expect(zoom.scale.value).toBe(1.5)

      zoom.updateZoomOffset({ offsetX: 120, offsetY: 90 } as MouseEvent)
      expect(zoom.zoomOffsetX.value).toBe(120)
      expect(zoom.zoomOffsetY.value).toBe(90)
    })
  })

  describe('gesture lifecycle', () => {
    it('binds no gesture handlers before the gallery becomes visible', () => {
      setupGallery()

      expect(usePinch).not.toHaveBeenCalled()
      expect(useDrag).not.toHaveBeenCalled()
    })

    it('scrolls the start slide into view and binds both gestures when the gallery opens', async () => {
      const slides = [createSlide(), createSlide()]
      const { visible, scrollImageIntoView } = setupGallery({
        startIndex: ref(1),
        slides,
      })

      await show(visible)

      expect(scrollImageIntoView).toHaveBeenCalledWith(1, 'instant')
      expect(usePinch).toHaveBeenCalledTimes(1)
      expect(useDrag).toHaveBeenCalledTimes(1)
      // Both gestures target the slide the gallery opened on.
      expect(toValue(getPinchConfig().domTarget)).toBe(slides[1])
      expect(toValue(getDragConfig().domTarget)).toBe(slides[1])
      expect(getPinchConfig().eventOptions).toEqual({ passive: true })
    })

    it('keeps panning after the slide changes', async () => {
      const startIndex = ref(0)
      const { visible, zoom } = setupGallery({ startIndex })
      await show(visible)

      getPinchHandler()({ offset: [250, 0], pinching: true })
      getPinchHandler()({ offset: [250, 0], pinching: false })
      startIndex.value = 1
      await nextTick()

      // The slide change reset the pan; the drag then pans the new slide.
      getDragHandler()({ dragging: true, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(20)
      expect(zoom.zoomOffsetY.value).toBe(10)
    })

    it('moves both gestures onto the new slide when the slide changes', async () => {
      const startIndex = ref(0)
      const { visible } = setupGallery({ startIndex })
      await show(visible)

      startIndex.value = 1
      await nextTick()

      expect(mockPinchController.clean).toHaveBeenCalledTimes(1)
      expect(mockPinchController.bind).toHaveBeenCalledTimes(1)
      expect(mockPinchController.reset).toHaveBeenCalledTimes(1)
      expect(mockDragController.clean).toHaveBeenCalledTimes(1)
      expect(mockDragController.bind).toHaveBeenCalledTimes(1)
      expect(mockDragController.reset).toHaveBeenCalledTimes(1)
    })

    it('resets the pan offset when the slide changes', async () => {
      const startIndex = ref(0)
      const { visible, zoom } = setupGallery({ startIndex })
      await show(visible)
      zoom.zoomOffsetX.value = 40
      zoom.zoomOffsetY.value = 25

      startIndex.value = 1
      await nextTick()

      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })

    it('pans again after the gallery reopens', async () => {
      const { visible, zoom } = setupGallery()
      await show(visible)

      visible.value = false
      await nextTick()
      await show(visible)

      getPinchHandler()({ offset: [250, 0], pinching: true })
      getPinchHandler()({ offset: [250, 0], pinching: false })
      getDragHandler()({ dragging: true, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(20)
      expect(zoom.zoomOffsetY.value).toBe(10)
    })

    it('unbinds and resets both gestures when the gallery hides', async () => {
      const { visible } = setupGallery()
      await show(visible)

      visible.value = false
      await nextTick()

      expect(mockPinchController.clean).toHaveBeenCalledTimes(1)
      expect(mockPinchController.reset).toHaveBeenCalledTimes(1)
      expect(mockPinchController.bind).not.toHaveBeenCalled()
      expect(mockDragController.clean).toHaveBeenCalledTimes(1)
      expect(mockDragController.reset).toHaveBeenCalledTimes(1)
      expect(mockDragController.bind).not.toHaveBeenCalled()
    })

    it('stops rebinding once the gallery has hidden', async () => {
      const startIndex = ref(0)
      const { visible } = setupGallery({ startIndex })
      await show(visible)
      visible.value = false
      await nextTick()
      vi.clearAllMocks()

      startIndex.value = 1
      await nextTick()

      expect(mockPinchController.bind).not.toHaveBeenCalled()
      expect(mockDragController.bind).not.toHaveBeenCalled()
    })

    it('unbinds both gestures when the gallery unmounts', async () => {
      const { wrapper, visible } = setupGallery()
      await show(visible)

      wrapper.unmount()

      expect(mockPinchController.clean).toHaveBeenCalledTimes(1)
      expect(mockDragController.clean).toHaveBeenCalledTimes(1)
      // Only the hide path also resets the gesture state.
      expect(mockPinchController.reset).not.toHaveBeenCalled()
      expect(mockDragController.reset).not.toHaveBeenCalled()
    })

    it('stops resetting the pan once the gallery unmounts', async () => {
      const startIndex = ref(0)
      const { wrapper, visible, zoom } = setupGallery({ startIndex })
      await show(visible)
      zoom.zoomOffsetX.value = 40

      wrapper.unmount()

      // The internal slide watch died with the component, so a later slide
      // change no longer resets the pan.
      startIndex.value = 1
      await nextTick()

      expect(zoom.zoomOffsetX.value).toBe(40)
    })

    it('leaves the pan at rest when the gallery unmounts before it opened', () => {
      const { wrapper, zoom } = setupGallery()

      wrapper.unmount()

      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })
  })

  describe('bound gesture handlers', () => {
    // The pinch offset spans 0 to 500 and maps onto a scale of 1 to 2.
    it.each([
      {
        label: 'maps the pinch offset onto the mobile zoom range',
        offset: 250,
        pinching: true,
        scale: 1.5,
      },
      {
        label: 'caps the pinch scale at the mobile maximum',
        offset: 1000,
        pinching: true,
        scale: 2,
      },
      {
        label: 'ignores a pinch that has ended',
        offset: 500,
        pinching: false,
        scale: 1,
      },
    ])('$label', async ({ offset, pinching, scale }) => {
      const { visible, zoom } = setupGallery()
      await show(visible)

      getPinchHandler()({ offset: [offset, 0], pinching })

      expect(zoom.scale.value).toBe(scale)
    })

    it('clamps the pan offset to the image bounds while pinching', async () => {
      const { visible, zoom } = setupGallery()
      await show(visible)
      zoom.zoomOffsetX.value = 400
      zoom.zoomOffsetY.value = 400

      getPinchHandler()({ offset: [250, 0], pinching: true })

      // A 450px wide picture at scale 1.5: (675 - 450) / 4.5
      expect(zoom.zoomOffsetX.value).toBe(50)
      // An 800px tall picture at scale 1.5: (1200 - 800) / 8
      expect(zoom.zoomOffsetY.value).toBe(50)
    })

    it('pans by the drag delta within the image bounds', async () => {
      const { visible, zoom } = setupGallery()
      await show(visible)
      const pinch = getPinchHandler()
      pinch({ offset: [250, 0], pinching: true })
      pinch({ offset: [250, 0], pinching: false })

      getDragHandler()({ dragging: true, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(20)
      expect(zoom.zoomOffsetY.value).toBe(10)
    })

    it('clamps the drag to the image bounds', async () => {
      const { visible, zoom } = setupGallery()
      await show(visible)
      const pinch = getPinchHandler()
      pinch({ offset: [250, 0], pinching: true })
      pinch({ offset: [250, 0], pinching: false })

      getDragHandler()({ dragging: true, delta: [500, 500] })

      expect(zoom.zoomOffsetX.value).toBe(50)
      expect(zoom.zoomOffsetY.value).toBe(50)
    })

    it('ignores a drag while a pinch is active', async () => {
      const { visible, zoom } = setupGallery()
      await show(visible)
      getPinchHandler()({ offset: [250, 0], pinching: true })

      getDragHandler()({ dragging: true, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })

    it('ignores a drag that has ended', async () => {
      const { visible, zoom } = setupGallery()
      await show(visible)
      const pinch = getPinchHandler()
      pinch({ offset: [250, 0], pinching: true })
      pinch({ offset: [250, 0], pinching: false })

      getDragHandler()({ dragging: false, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })
  })

  describe('gesture rebinding when the current slide has no zoom node', () => {
    /** Opens the gallery on a single slide, leaving slide 1 without an element. */
    const openZoom = async (startIndex: Ref<number>) => {
      const { visible, zoom } = setupGallery({
        startIndex,
        slides: [createSlide()],
      })
      await show(visible)
      return zoom
    }

    // @vueuse/gesture throws when bind() runs without a target, which the
    // mocked controllers would not.
    it('unbinds both gestures without rebinding them', async () => {
      const startIndex = ref(0)
      await openZoom(startIndex)

      startIndex.value = 1
      await nextTick()

      expect(mockPinchController.clean).toHaveBeenCalledTimes(1)
      expect(mockDragController.clean).toHaveBeenCalledTimes(1)
      expect(mockPinchController.bind).not.toHaveBeenCalled()
      expect(mockDragController.bind).not.toHaveBeenCalled()
    })

    it('keeps the pan inert while the slide has no element', async () => {
      const startIndex = ref(0)
      const zoom = await openZoom(startIndex)

      getPinchHandler()({ offset: [250, 0], pinching: true })
      zoom.zoomOffsetX.value = 12
      zoom.zoomOffsetY.value = 8

      startIndex.value = 1
      await nextTick()

      // The slide change reset the pan; with no slide element to bind to, a
      // drag cannot move it again.
      getDragHandler()({ dragging: true, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(0)
      expect(zoom.zoomOffsetY.value).toBe(0)
    })

    it('pans again when returning to a slide with an element', async () => {
      const startIndex = ref(0)
      const zoom = await openZoom(startIndex)

      startIndex.value = 1
      await nextTick()
      startIndex.value = 0
      await nextTick()

      getPinchHandler()({ offset: [250, 0], pinching: true })
      getPinchHandler()({ offset: [250, 0], pinching: false })
      getDragHandler()({ dragging: true, delta: [20, 10] })

      expect(zoom.zoomOffsetX.value).toBe(20)
      expect(zoom.zoomOffsetY.value).toBe(10)
    })
  })
})
