import { computed, nextTick, onScopeDispose, ref, toValue, watch } from 'vue'
import { useMediaQuery, useMounted } from '@vueuse/core'
import { usePinch, useDrag } from '@vueuse/gesture'
import type { MaybeRef, Ref, WatchStopHandle } from 'vue'
import { clamp, mapNumberToRange } from '@client/utils/math'

/** Minimal scroll API consumed by the zoom modal slider. */
export interface GallerySliderScrollController {
  /** Scrolls a slide into view by index. */
  scrollImageIntoView: (index: number, scrollBehavior?: ScrollBehavior) => void
}

interface UseGalleryZoomReturn {
  /**
   * The current zoom scale, reactive and bounded by MIN_ZOOM and MAX_ZOOM_MOBILE/MAX_ZOOM_DESKTOP.
   */
  scale: Ref<number>
  /**
   * Computed ref indicating whether the device supports touch input.
   */
  isTouchSupported: Ref<boolean>
  /**
   * Pan offset in the X direction, updated by pan and pinch gestures.
   */
  zoomOffsetX: Ref<number>
  /**
   * Pan offset in the Y direction, updated by pan and pinch gestures.
   */
  zoomOffsetY: Ref<number>
  /**
   * Toggles between min and desktop max zoom. With a MouseEvent, the event position sets the pan offset.
   */
  toggleDoubleZoom: (event?: MouseEvent) => void
  /**
   * Updates zoom pan offset from mouse position (desktop) or clamps it within bounds (touch).
   */
  updateZoomOffset: (event: MouseEvent) => void
}

/**
 * Provides zoom and pan state and handlers for a product image gallery.
 * Used in product gallery/lightbox components for desktop double-click zoom and
 * mobile pinch/drag gestures. Binds pinch and drag gesture handlers when the
 * gallery is visible and cleans them up on hide or dispose.
 *
 * @param visible Ref that controls whether the gallery is visible; gesture handlers are bound when it becomes true
 * @param startIndex Ref or number for the initial slide index when the gallery opens; read when visible becomes true
 * @param sliderRef Ref to an object exposing `scrollImageIntoView`
 * @param slidesRef Ref to the array of slide DOM elements (bind with ref="..." on the v-for slide element). Slides that cannot zoom (e.g. videos) may leave their index empty; pinch and drag stay unbound while that slide is current.
 *
 * @note The current slide index is owned by the parent (e.g. SFProductGallery); this composable uses
 *   `startIndex` only for scroll positioning and zoom targeting, not as the source of truth for which slide is active.
 *
 * @returns Object with reactive zoom state and callbacks: `scale`, `isTouchSupported`,
 *   `zoomOffsetX`, `zoomOffsetY`, `toggleDoubleZoom`, `updateZoomOffset`
 *
 * @example
 * ```ts
 * const visible = ref(false)
 * const sliderRef = ref<GallerySliderScrollController>()
 * const slidesRef = ref<HTMLDivElement[]>([])
 * const { scale, ... } = useGalleryZoom(visible, () => props.startIndex ?? 0, sliderRef, slidesRef)
 * // On each image slide element: a function ref into slidesRef
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-detail-page
 */
export const useGalleryZoom = (
  visible: Ref<boolean>,
  startIndex: MaybeRef<number>,
  sliderRef: Ref<GallerySliderScrollController | undefined>,
  slidesRef: Ref<HTMLDivElement[] | undefined>,
): UseGalleryZoomReturn => {
  let pinchController: ReturnType<typeof usePinch>
  let dragController: ReturnType<typeof useDrag>
  let stopZoomElementWatch: WatchStopHandle

  // Zoom

  // Shared
  const zoomOffsetY = ref(0)
  const zoomOffsetX = ref(0)
  const scale = ref(1)

  // `(pointer: coarse)` = primary input is coarse (finger). Reactively tracks
  // hybrid devices (e.g. iPad when a trackpad is connected/disconnected).
  // Gated by `useMounted` so the first client render matches SSR (`false`);
  // `useMediaQuery` otherwise evaluates `matchMedia` synchronously in setup.
  const isMounted = useMounted()
  const coarsePointer = useMediaQuery('(pointer: coarse)')
  const isTouchSupported = computed(
    () => isMounted.value && coarsePointer.value,
  )
  const MIN_ZOOM = 1

  // mobile zoom
  const zoomElement = computed(() => slidesRef.value?.[toValue(startIndex)])
  const pinchActive = ref(false)
  const MAX_PINCH_ZOOM = 500
  const MAX_ZOOM_MOBILE = 2

  /** Resets zoom pan offset to origin. */
  const resetOffset = () => {
    zoomOffsetX.value = 0
    zoomOffsetY.value = 0
  }

  /** Computes max pan offset for the current zoom element and scale so pan stays within image bounds. */
  const getMaxOffset = (scale: number) => {
    const image = zoomElement.value?.querySelector('picture')
    const imgWidth = image?.clientWidth || 0
    const imgHeight = image?.clientHeight || 0

    return {
      maxOffsetX: Math.max(0, (imgWidth * scale - imgWidth) / 4.5),
      maxOffsetY: Math.max(0, (imgHeight * scale - imgHeight) / 8),
    }
  }

  /** Updates zoom pan offset from mouse position (desktop) or keeps offset within bounds (touch). No-op when scale ≤ 1. */
  const updateZoomOffset = (event: MouseEvent) => {
    if (scale.value <= 1) {
      return
    }
    if (!isTouchSupported.value) {
      zoomOffsetY.value = event.offsetY
      zoomOffsetX.value = event.offsetX
    } else {
      const { maxOffsetX, maxOffsetY } = getMaxOffset(scale.value)
      zoomOffsetX.value = clamp(zoomOffsetX.value, -maxOffsetX, maxOffsetX)
      zoomOffsetY.value = clamp(zoomOffsetY.value, -maxOffsetY, maxOffsetY)
    }
  }

  // desktop zoom
  const MAX_ZOOM_DESKTOP = 1.5
  /**
   * Toggles between min and desktop max zoom. With a `MouseEvent` (click) the
   * event position sets the pan offset; without one (keyboard activation) the
   * zoom centers on the current offset (typically the image center).
   */
  const toggleDoubleZoom = (event?: MouseEvent) => {
    if (scale.value <= MIN_ZOOM) {
      scale.value = MAX_ZOOM_DESKTOP
      if (event) {
        updateZoomOffset(event)
      }
    } else {
      scale.value = MIN_ZOOM
      if (isTouchSupported.value) {
        resetOffset()
      }
    }
  }

  /** Handles pinch gesture: updates scale and clamps pan offset to image bounds. */
  const pinchHandler = ({
    offset: [pinchZoom],
    pinching,
  }: {
    offset: [number, number]
    pinching: boolean
  }) => {
    pinchActive.value = pinching
    if (!pinching) {
      return
    }
    scale.value = mapNumberToRange(
      pinchZoom,
      0,
      MAX_PINCH_ZOOM,
      MIN_ZOOM,
      MAX_ZOOM_MOBILE,
    )

    const { maxOffsetX, maxOffsetY } = getMaxOffset(scale.value)
    zoomOffsetX.value = clamp(zoomOffsetX.value, -maxOffsetX, maxOffsetX)
    zoomOffsetY.value = clamp(zoomOffsetY.value, -maxOffsetY, maxOffsetY)
  }
  /** Handles drag gesture: updates pan offset within bounds; no-op while pinching. */
  const dragHandler = ({
    dragging,
    delta: [x, y],
  }: {
    dragging: boolean
    delta: [number, number]
  }) => {
    if (!dragging || pinchActive.value) {
      return
    }

    const { maxOffsetX, maxOffsetY } = getMaxOffset(scale.value)
    zoomOffsetX.value = clamp(zoomOffsetX.value + x, -maxOffsetX, maxOffsetX)
    zoomOffsetY.value = clamp(zoomOffsetY.value + y, -maxOffsetY, maxOffsetY)
  }

  watch(visible, (isNowVisible) => {
    if (isNowVisible) {
      void nextTick(() => {
        sliderRef.value?.scrollImageIntoView(toValue(startIndex), 'instant')
        pinchController = usePinch(pinchHandler, {
          domTarget: zoomElement,
          eventOptions: {
            passive: true,
          },
        })
        dragController = useDrag(dragHandler, {
          domTarget: zoomElement,
          eventOptions: {
            passive: true,
          },
        })
        stopZoomElementWatch = watch(zoomElement, (element) => {
          // Video slides omit a zoom node so native controls keep working.
          // @vueuse/gesture throws if bind() runs with an undefined domTarget.
          pinchController?.clean()
          dragController?.clean()
          if (element) {
            pinchController?.bind()
            pinchController?.reset()
            dragController?.bind()
            dragController?.reset()
          }

          resetOffset()
        })
      })
    } else {
      if (stopZoomElementWatch) {
        stopZoomElementWatch()
      }
      pinchController?.clean()
      pinchController?.reset()
      dragController?.clean()
      dragController?.reset()
    }
  })

  onScopeDispose(() => {
    if (stopZoomElementWatch) {
      stopZoomElementWatch()
    }
    pinchController?.clean()
    dragController?.clean()
  })

  return {
    scale,
    isTouchSupported,
    zoomOffsetX,
    zoomOffsetY,
    toggleDoubleZoom,
    updateZoomOffset,
  }
}
