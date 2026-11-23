<!-- eslint-disable vuejs-accessibility/no-static-element-interactions -- Hover and focus only track state for the arrows. The slides and arrows inside are the interactive elements. -->
<template>
  <div
    role="group"
    class="relative size-full"
    :aria-label="ariaLabel ?? $t('image_slider.a11ly.list_label')"
    data-testid="image-strip"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @focusin="isFocused = true"
    @focusout="isFocused = false"
  >
    <ul
      ref="sliderRef"
      tabindex="-1"
      class="scrollbar-hide flex size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      @scroll.passive="onScroll"
    >
      <li
        v-for="(image, index) in images"
        :key="image.hash ?? index"
        class="relative flex max-w-full min-w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden rounded-lg"
        :data-testid="`image-strip-slide-${index}`"
      >
        <slot name="slide" :image="image" :index="index">
          <SFProductImage
            :url="image.url"
            :preset="image.preset"
            :alt="image.alt"
            :image-loading="index < eagerLoadingCount ? 'eager' : 'lazy'"
            :fetch-priority="index === 0 ? fetchPriority : undefined"
            class="size-full"
            @click="$emit('slideClick', index)"
          />
        </slot>
      </li>
    </ul>

    <div
      v-if="hasArrows"
      class="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
      :class="areArrowsVisible ? 'opacity-100' : 'invisible opacity-0'"
    >
      <SFSliderArrowButton
        direction="previous"
        :disabled="!isPrevEnabled"
        class="absolute top-1/2 left-0 -translate-y-1/2 rounded-r-full pr-1"
        :accessible-label="$t('image_slider.a11ly.go_to_previous_image')"
        data-testid="image-strip-prev-button"
        @click="prev()"
      />
      <SFSliderArrowButton
        direction="next"
        :disabled="!isNextEnabled"
        class="absolute top-1/2 right-0 -translate-y-1/2 rounded-l-full pl-1"
        :accessible-label="$t('image_slider.a11ly.go_to_next_image')"
        data-testid="image-strip-next-button"
        @click="next()"
      />
    </div>
  </div>
</template>
<!-- eslint-enable vuejs-accessibility/no-static-element-interactions -->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useItemsSlider } from '@client/composables/useItemSlider'
import { useSliderArrowVisibility } from '@client/composables/useSliderArrowVisibility'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFSliderArrowButton from '@client/components/ui/core/SFSliderArrowButton.vue'
import type { ImageSliderImage } from '@client/utils/constants'

const {
  images,
  ariaLabel,
  withArrows = false,
  forceArrowsVisible = false,
  fetchPriority,
  eagerLoadingCount = 1,
} = defineProps<{
  /** Images to render as a horizontally-scrollable list. */
  images: ImageSliderImage[]
  /**
   * Accessible name for the image group. Defaults to a translated label;
   * pass the product name so the strip reads as that product's images.
   * The wrapper is a `role="group"`, not a `<section>` region landmark, so
   * repeated strips on one page (several product tiles) do not need unique names.
   */
  ariaLabel?: string
  /** When true, renders prev/next jump buttons (revealed on hover/focus). */
  withArrows?: boolean
  /**
   * Forces the arrows visible regardless of the strip's own hover/focus state.
   * Use when a parent owns the hover region (e.g. a product card reveals arrows
   * on card hover, not just over the image area).
   */
  forceArrowsVisible?: boolean
  /** Fetch priority applied to the first image only. */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Number of leading images loaded eagerly; the rest load lazily. */
  eagerLoadingCount?: number
}>()

const emit = defineEmits<{
  /**
   * Emitted with the image index when a default-rendered image is clicked.
   * Mirrors `slideClick` on SFImageGallery.
   */
  slideClick: [index: number]
  /** Emitted when the visible slide index changes after scroll or arrow navigation. */
  activeSlideChange: [index: number]
}>()

const sliderRef = ref<HTMLElement>()

const {
  next,
  prev,
  isNextEnabled,
  isPrevEnabled,
  onScroll,
  scrollImageIntoView,
  activeSlide,
} = useItemsSlider(sliderRef as Ref<HTMLElement>, 'horizontal')

watch(activeSlide, (index) => {
  emit('activeSlideChange', index)
})

const { isHovered, isFocused, areArrowsVisible } = useSliderArrowVisibility(
  () => forceArrowsVisible,
)

const hasArrows = computed(() => withArrows && images.length > 1)

defineExpose({
  /** Scrolls an image into view by index. */
  scrollImageIntoView,
})

defineSlots<{
  /** Override image content (e.g. wrap each image in a link to the PDP). */
  slide?: (props: { image: ImageSliderImage; index: number }) => unknown
}>()
</script>
