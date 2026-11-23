<template>
  <SFModal
    v-model:visible="visible"
    class="size-full max-h-dvh max-w-screen bg-white p-0"
    :backdrop="false"
    :label="$t('product_image.a11y.zoom_dialog_label')"
    @close="$emit('close')"
  >
    <div
      class="flex h-full min-h-0 flex-col pt-5 max-sm:bg-product-image-background lg:mx-auto lg:aspect-product lg:h-dvh"
    >
      <div class="relative flex min-h-0 flex-1 flex-col">
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- The scrolling carousel is focusable and handles arrow, Home, End, Enter and Space keys (WAI-ARIA carousel pattern). -->
        <div
          :id="sliderId"
          ref="sliderRef"
          class="scrollbar-hide flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          role="group"
          aria-roledescription="carousel"
          :aria-label="
            $t('product_image.a11y.zoomed_gallery_label', { name: alt })
          "
          aria-keyshortcuts="ArrowLeft ArrowRight Home End Enter Space"
          tabindex="0"
          data-testid="zoom-gallery"
          @keydown="onKeydown"
          @scroll.passive="onScroll"
        >
          <div
            v-for="(image, index) in zoomImages"
            :key="image.hash ?? index"
            class="relative flex max-w-full min-w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden"
            role="group"
            aria-roledescription="slide"
            :aria-label="
              $t('image_slider.a11ly.image_position', {
                current: index + 1,
                total: items.length,
              })
            "
            :inert="index !== activeSlideIndex"
            :data-testid="`zoom-gallery-slide-${index}`"
          >
            <SFProductVideoSlide
              v-if="items[index]?.type === 'video'"
              :url="items[index].url"
              :poster-url="items[index].posterUrl"
              :alt="image.alt"
              :is-playing="visible && index === activeSlideIndex"
            />
            <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Keyboard users toggle the zoom with Enter or Space on the focused gallery (`activateSlide`). -->
            <div
              v-else
              :ref="(el) => setSlide(el as HTMLDivElement | null, index)"
              :class="
                scaleValue >= 2 && index === activeSlideIndex
                  ? 'cursor-zoom-out'
                  : 'cursor-zoom-in'
              "
              class="flex size-full items-center justify-center overflow-hidden max-sm:bg-product-image-background"
              @click="toggleDoubleZoom"
            >
              <SFProductImage
                :url="image.url"
                :preset="image.preset"
                :alt="image.alt"
                fetch-priority="auto"
                image-loading="lazy"
                :data-testid="`product-image-zoom-${index}`"
                :style="activeSlideIndex === index ? productImageStyle : {}"
                class="transition-transform duration-75"
                :with-mix-blend-darken="false"
                :apply-padding="image.applyPadding"
                @mousemove="updateZoomOffset"
              />
            </div>
          </div>
        </div>

        <p
          class="sr-only"
          aria-live="polite"
          data-testid="zoom-gallery-live-region"
        >
          {{ liveRegionText }}
        </p>
      </div>

      <footer
        v-if="items.length > 1"
        class="flex w-full shrink-0 items-center justify-between bg-white p-2 max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        data-testid="zoom-gallery-footer"
      >
        <p class="body-default tabular-nums" aria-hidden="true">
          {{
            $t('product_image.a11y.slide_position', {
              current: activeSlideIndex + 1,
              total: items.length,
            })
          }}
        </p>
        <div class="flex gap-0.5">
          <SFSliderArrowButton
            direction="previous"
            :controls="sliderId"
            :disabled="!isPrevEnabled"
            :accessible-label="$t('image_slider.a11ly.go_to_previous_image')"
            data-testid="zoom-gallery-prev-button"
            class="rounded-l-full pl-0.5"
            @click="goToPrev()"
          />
          <SFSliderArrowButton
            direction="next"
            :controls="sliderId"
            :disabled="!isNextEnabled"
            :accessible-label="$t('image_slider.a11ly.go_to_next_image')"
            data-testid="zoom-gallery-next-button"
            class="rounded-r-full pr-0.5"
            @click="goToNext()"
          />
        </div>
      </footer>
    </div>
  </SFModal>
</template>

<script setup lang="ts">
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductVideoSlide from '@client/components/product/detail/productGallery/SFProductVideoSlide.vue'
import SFModal from '@client/components/ui/core/SFModal.vue'
import SFSliderArrowButton from '@client/components/ui/core/SFSliderArrowButton.vue'
import type { ImageSliderImage } from '@client/utils/constants'
import type { GallerySliderScrollController } from '@client/composables/useGalleryZoom'
import { useGalleryZoom } from '@client/composables/useGalleryZoom'
import { useItemsSlider } from '@client/composables/useItemSlider'
import { useKeydownActions } from '@client/composables/useKeydownActions'
import type { ProductGalleryItem } from '@shared/utils/productGalleryMedia'
import { GALLERY_ZOOM_PRESET } from '@shared/utils/productGalleryMedia'
import { computed, nextTick, onMounted, Ref, ref, useId, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  alt: string
  items: ProductGalleryItem[]
  currentSlideIndex?: number
}>()

const emit = defineEmits<{
  close: []
  'update:slide': [number]
}>()

const visible = defineModel<boolean>('visible', { default: false })

const { t } = useI18n()

const sliderRef = ref<HTMLElement>()
const sliderId = `zoom-gallery-${useId().replace(/:/g, '')}`
const slides = ref<HTMLDivElement[]>([])

const {
  isNextEnabled,
  isPrevEnabled,
  onScroll,
  scrollImageIntoView,
  activeSlide,
} = useItemsSlider(sliderRef as Ref<HTMLElement>, 'horizontal')

// `SFProductGallery` creates this modal lazily, on the first zoom, so it is
// born with `visible` already `true` and `currentSlideIndex` already pointing
// at the tile the user clicked. That first open is the one case with no prop
// change for a watcher to react to, so the clicked index has to be the slider's
// starting value or the first zoom of a page view always opens slide 0. Later
// opens do change both props on this same instance — the gallery never unmounts
// it — and the `currentSlideIndex` watcher below is what carries those.
activeSlide.value = props.currentSlideIndex ?? 0

const activeSlideIndex = computed(() => activeSlide.value)

const goToSlide = (
  index: number,
  behavior: 'auto' | 'smooth' | 'instant' = 'auto',
) => {
  activeSlide.value = index
  scrollImageIntoView(index, behavior)
}

const goToPrev = () => {
  if (isPrevEnabled.value) {
    goToSlide(activeSlide.value - 1, 'smooth')
  }
}

const goToNext = () => {
  if (isNextEnabled.value) {
    goToSlide(activeSlide.value + 1, 'smooth')
  }
}

const sliderControllerRef = ref<GallerySliderScrollController>({
  scrollImageIntoView: (index, behavior) => goToSlide(index, behavior),
})

const zoomImages = computed<ImageSliderImage[]>(() =>
  props.items.map((item, index) => ({
    url: item.type === 'image' ? item.url : (item.posterUrl ?? item.url),
    preset: GALLERY_ZOOM_PRESET,
    alt:
      item.type === 'video'
        ? t('product_video.a11y.slide_label', {
            name: props.alt,
            index: index + 1,
            total: props.items.length,
          })
        : t('product_image.alt_with_image_index', {
            alt: props.alt,
            index: index + 1,
            total: props.items.length,
          }),
    hash: item.url,
    applyPadding: item.type === 'image' ? item.applyPadding : false,
  })),
)

const liveRegionText = computed(() =>
  t('image_slider.a11ly.image_position', {
    current: activeSlideIndex.value + 1,
    total: props.items.length,
  }),
)

// Vue calls this with the element on mount and with `null` on unmount. Clearing
// the slot on `null` keeps `slides` in step with the rendered images, so zoom
// gestures never bind to a detached node when the product (and its image count)
// changes while the modal stays mounted. Video slides are omitted so pinch and
// drag never attach to a playing video.
const setSlide = (el: HTMLDivElement | null, index: number) => {
  if (el) {
    slides.value[index] = el
  } else {
    delete slides.value[index]
  }
}

const {
  scale,
  toggleDoubleZoom,
  updateZoomOffset,
  isTouchSupported,
  zoomOffsetX,
  zoomOffsetY,
} = useGalleryZoom(
  visible as Ref<boolean>,
  activeSlideIndex,
  sliderControllerRef as Ref<GallerySliderScrollController>,
  slides as Ref<HTMLDivElement[]>,
)

const scaleValue = computed(() => scale.value)

const onSlideChange = (newIndex: number) => {
  scale.value = 1
  emit('update:slide', newIndex)
}

// Enter/Space toggles the zoom, but only when the carousel itself is focused,
// never when the event bubbled up from focusable content inside a slide, such
// as the controls of a video. The footer arrows are siblings of the scroller.
const activateSlide = (event: KeyboardEvent) => {
  if (event.target !== event.currentTarget) {
    return
  }
  if (props.items[activeSlideIndex.value]?.type === 'video') {
    return
  }
  event.preventDefault()
  toggleDoubleZoom()
}

const onKeydown = useKeydownActions(
  {
    right: (event) => {
      event.preventDefault()
      goToNext()
    },
    left: (event) => {
      event.preventDefault()
      goToPrev()
    },
    home: (event) => {
      event.preventDefault()
      goToSlide(0, 'smooth')
    },
    end: (event) => {
      event.preventDefault()
      goToSlide(props.items.length - 1, 'smooth')
    },
    enter: activateSlide,
    space: activateSlide,
  },
  { preventDefault: false },
)

const productImageStyle = computed(() => {
  // translate did cause jitter on desktop, and transform-origin did cause jitter with touch
  // therefore we use different approaches here
  return isTouchSupported.value
    ? `transform: scale(${scale.value}) translate(${zoomOffsetX.value}px, ${zoomOffsetY.value}px)`
    : `transform: scale(${scale.value}); transform-origin: ${zoomOffsetX.value}px ${zoomOffsetY.value}px;`
})

watch(activeSlideIndex, (index) => onSlideChange(index))

watch(
  () => props.currentSlideIndex,
  (index) => {
    if (!visible.value || index === undefined) {
      return
    }
    if (index !== activeSlideIndex.value) {
      goToSlide(index, 'instant')
    }
  },
)

// Seeding `activeSlide` above fixes which slide counts as active, but not where
// the scroll container sits. The list element is behind `SFModal`'s
// `ClientOnly`, so it appears a tick after this component mounts rather than at
// `onMounted` — waiting for the element itself is what makes the opening scroll
// deterministic.
watch(
  sliderRef,
  async (element) => {
    if (!element) {
      return
    }
    // A `<dialog>` is `display: none` until `v-dialog` calls `showModal()`, and
    // scrolling a zero-width element goes nowhere. One tick puts this after the
    // directive, matching the path a reopen already takes.
    await nextTick()
    scrollImageIntoView(activeSlide.value, 'instant')
  },
  { once: true },
)

onMounted(() => {
  useEventListener(document, 'gesturestart', (e) => {
    e.preventDefault()
  })
  useEventListener(document, 'gesturechange', (e) => {
    e.preventDefault()
  })
})
</script>
