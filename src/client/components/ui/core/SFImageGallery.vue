<template>
  <!--
    The scrolling element is the carousel: it carries the name, the carousel
    role description, the shortcuts and the single Tab stop, so axe finds the
    scrollable region focusable and the focused element announces itself.
    `role="group"` lets a `div` hold the name and role description.
    `aria-roledescription="carousel"` gives experienced AT users the
    convention hint that arrows might navigate slides, but it's not
    self-explanatory. `aria-keyshortcuts` makes the contract explicit, so
    NVDA/JAWS/VoiceOver announce the keys on focus and first-time users
    discover the navigation without trial and error.
  -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- Hover and focus only track whether to show the arrows, the carousel inside owns the keyboard. -->
  <div
    class="relative size-full"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @focusin="isFocused = true"
    @focusout="isFocused = false"
  >
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- The carousel is focusable and handles arrow, Home, End, Enter and Space keys (WAI-ARIA carousel pattern). Hover only tracks pointer state, `focusin` tracks focus. -->
    <div
      :id="sliderId"
      ref="sliderRef"
      class="scrollbar-hide flex size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      role="group"
      aria-roledescription="carousel"
      :aria-label="ariaLabel ?? $t('image_slider.a11ly.carousel_label')"
      aria-keyshortcuts="ArrowLeft ArrowRight Home End Enter Space"
      :aria-busy="isLoading"
      tabindex="0"
      data-testid="image-gallery"
      @keydown="onKeydown"
      @scroll.passive="onScroll"
    >
      <div
        v-for="(image, index) in images"
        :key="image.hash ?? index"
        class="relative flex max-w-full min-w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden"
        :class="slideClass"
        role="group"
        aria-roledescription="slide"
        :aria-label="
          $t('image_slider.a11ly.image_position', {
            current: index + 1,
            total: images.length,
          })
        "
        :inert="index !== activeSlide"
        :data-testid="`image-gallery-slide-${index}`"
      >
        <slot
          name="slide"
          :image="image"
          :index="index"
          :is-active="index === activeSlide"
        >
          <span
            v-if="isLoading"
            class="size-full animate-pulse bg-gray-100"
            data-testid="image-gallery-skeleton"
          />
          <SFProductImage
            v-else
            :url="image.url"
            :preset="image.preset"
            :alt="image.alt"
            :image-loading="index < eagerLoadingCount ? 'eager' : 'lazy'"
            :fetch-priority="index === 0 ? fetchPriority : undefined"
            :apply-padding="image.applyPadding"
            class="size-full max-sm:rounded-none!"
            @click="$emit('slideClick', index)"
          />
        </slot>
      </div>
    </div>

    <!--
      Arrow buttons are mouse affordance only. The carousel region itself owns
      ArrowLeft/Right/Home/End via `onKeydown`, so duplicate Tab stops on the
      buttons would just add noise (and AT would announce "Previous image,
      Next image" twice on the same widget). `tabindex="-1"` + `aria-hidden`
      keep the click target without polluting the tab/AT order.
    -->
    <div
      v-if="hasArrows"
      class="pointer-events-none z-10 transition-opacity duration-150"
      :class="[
        arrowsContainerClass,
        areArrowsVisible ? 'opacity-100' : 'invisible opacity-0',
      ]"
    >
      <SFSliderArrowButton
        direction="previous"
        :controls="sliderId"
        :disabled="!isPrevEnabled"
        :class="prevArrowClass"
        :accessible-label="$t('image_slider.a11ly.go_to_previous_image')"
        tabindex="-1"
        aria-hidden="true"
        data-testid="image-gallery-prev-button"
        @click="goToPrev()"
      />
      <SFSliderArrowButton
        direction="next"
        :controls="sliderId"
        :disabled="!isNextEnabled"
        :class="nextArrowClass"
        :accessible-label="$t('image_slider.a11ly.go_to_next_image')"
        tabindex="-1"
        aria-hidden="true"
        data-testid="image-gallery-next-button"
        @click="goToNext()"
      />
    </div>

    <SFImageSliderDots
      v-if="showDots"
      class="absolute bottom-5 left-1/2 z-10 -translate-x-1/2"
      :class="dotsClass"
      :count="images.length"
      :active="activeSlide"
      :controls="sliderId"
      @select="scrollToSlide"
    />

    <slot name="overlay" />

    <p
      class="sr-only"
      aria-live="polite"
      data-testid="image-gallery-live-region"
    >
      {{ liveRegionText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useItemsSlider } from '@client/composables/useItemSlider'
import { useSliderArrowVisibility } from '@client/composables/useSliderArrowVisibility'
import { useKeydownActions } from '@client/composables/useKeydownActions'
import SFImageSliderDots from '@client/components/ui/core/SFImageSliderDots.vue'
import SFSliderArrowButton from '@client/components/ui/core/SFSliderArrowButton.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import type { ImageSliderImage } from '@client/utils/constants'

const {
  images,
  fullViewport = false,
  ariaLabel,
  isLoading = false,
  withArrows = true,
  withDots = true,
  dotsClass,
  fetchPriority,
  eagerLoadingCount = 1,
} = defineProps<{
  /** Slides to render. Drives slide count, keys and the carousel ARIA labels. */
  images: ImageSliderImage[]
  /**
   * Full-bleed styling for the zoom modal: square corners and the prev/next
   * chevrons clustered in the bottom-right corner instead of spread to the edges.
   */
  fullViewport?: boolean
  /** Accessible name for the carousel region. Defaults to a translated label. */
  ariaLabel?: string
  /** When true, renders a skeleton placeholder for every slide. */
  isLoading?: boolean
  /** When true, renders prev/next chevron buttons (revealed on hover/focus). */
  withArrows?: boolean
  /** Whether to render the dots indicator. */
  withDots?: boolean
  /**
   * Extra classes for the dots indicator. Use to control its responsive
   * visibility (e.g. `lg:hidden` when a desktop layout shows a thumbnail rail).
   */
  dotsClass?: string
  /** Fetch priority applied to the first slide image only. */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Number of leading slides loaded eagerly; the rest load lazily. */
  eagerLoadingCount?: number
}>()

const emit = defineEmits<{
  /** Emitted with the active slide index whenever it changes. */
  'update:activeSlide': [index: number]
  /**
   * Emitted with the slide index when the active slide is activated — either by
   * clicking its default-rendered image or by pressing Enter/Space with the
   * carousel focused. Wire it to open a zoom view on the PDP.
   */
  slideClick: [index: number]
}>()

const { t } = useI18n()

const sliderRef = ref<HTMLElement>()

// Stable id for the slides list, referenced by the arrow/dot `aria-controls`.
const sliderId = `image-gallery-${useId().replace(/:/g, '')}`

const {
  isNextEnabled,
  isPrevEnabled,
  onScroll,
  scrollImageIntoView,
  activeSlide,
} = useItemsSlider(sliderRef as Ref<HTMLElement>, 'horizontal')

const { isHovered, isFocused, areArrowsVisible } = useSliderArrowVisibility()

const hasArrows = computed(() => withArrows && images.length > 1)

const showDots = computed(() => withDots && images.length > 1)

// Full viewport clusters both chevrons in the bottom-right corner (per Figma);
// otherwise they spread flush to the center-left and center-right edges.
// The "Rounded Button" is a 36px D-shape: a half-pill rounded on its outer side
// only, with a 4px (spread) / 2px (cluster) caret nudge toward the flat side.
const arrowsContainerClass = computed(() =>
  fullViewport ? 'absolute right-5 bottom-5 flex gap-px' : 'absolute inset-0',
)

const prevArrowClass = computed(() =>
  fullViewport
    ? 'rounded-l-full pl-0.5'
    : 'absolute top-1/2 left-0 -translate-y-1/2 rounded-r-full pr-1',
)

const nextArrowClass = computed(() =>
  fullViewport
    ? 'rounded-r-full pr-0.5'
    : 'absolute top-1/2 right-0 -translate-y-1/2 rounded-l-full pl-1',
)

// The non-fullViewport gallery (PDP main image) is edge-to-edge below `sm`, so
// square the corners on mobile and only round from `sm` up. The zoom modal
// (fullViewport) stays square at every width.
const slideClass = computed(() =>
  fullViewport ? 'rounded-none' : 'rounded-none sm:rounded-lg',
)

const liveRegionText = computed(() =>
  t('image_slider.a11ly.image_position', {
    current: activeSlide.value + 1,
    total: images.length,
  }),
)

// Eagerly mark the target as the active slide before scrolling. The internal
// active index is otherwise driven only by the throttled scroll handler, which
// leaves a window where the just-targeted slide is still `inert` — and `inert`
// blocks the pointer events that the zoom modal's pinch/drag handlers bind to
// the active slide. Reflecting the index synchronously also lets the polite
// live region announce the new slide on the same tick the user activates the
// navigation, rather than 0–100 ms later when the throttled scroll handler
// would otherwise be the only writer of `activeSlide`.
const goToSlide = (
  index: number,
  behavior: 'auto' | 'smooth' | 'instant' = 'auto',
) => {
  activeSlide.value = index
  scrollImageIntoView(index, behavior)
}

const scrollToSlide = (index: number) => goToSlide(index, 'smooth')

// Prev/next via `goToSlide` so ArrowLeft/Right and the arrow buttons take the
// same eager path as Home/End and the dots — `useItemsSlider`'s bare
// `next()` / `prev()` would scroll but defer the `activeSlide` update.
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

// Enter/Space activates the current slide (e.g. opens zoom), but only when the
// carousel itself is focused — never when the event bubbled up from focusable
// content inside a slide (the `slide` slot), which handles its own activation.
// The arrow buttons, the dots and the overlay are siblings of the scroller, so
// their key events never reach this handler.
const activateSlide = (event: KeyboardEvent) => {
  if (event.target !== event.currentTarget) {
    return
  }
  event.preventDefault()
  emit('slideClick', activeSlide.value)
}

// `preventDefault: false` because `enter`/`space` (activateSlide) only prevent
// when the carousel itself is focused — never when the event bubbled up from
// focusable slide content. The arrow/Home/End actions prevent explicitly.
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
      scrollToSlide(0)
    },
    end: (event) => {
      event.preventDefault()
      scrollToSlide(images.length - 1)
    },
    enter: activateSlide,
    space: activateSlide,
  },
  { preventDefault: false },
)

watch(activeSlide, (index) => emit('update:activeSlide', index))

defineExpose({
  /**
   * Scrolls a slide into view by index and marks it active immediately (so
   * `inert` and the live region update on the same tick, not after the
   * throttled scroll handler). Consumed by `useGalleryZoom` and `SFProductGallery`.
   */
  scrollImageIntoView: goToSlide,
  /** The current active slide index. */
  activeSlide,
})

defineSlots<{
  /** Override slide content. Receives the image, its index and active state. */
  slide?: (props: {
    image: ImageSliderImage
    index: number
    isActive: boolean
  }) => unknown
  /** Absolutely-positioned overlay above the slides (e.g. wishlist, badges). */
  overlay?: () => unknown
}>()
</script>
