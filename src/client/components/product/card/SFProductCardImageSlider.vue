<template>
  <SFImageStrip
    ref="sliderRef"
    class="size-full"
    :images="sliderImages"
    :with-arrows="hasNavigableArrows"
    :force-arrows-visible="isProductHovered"
    :aria-label="alt"
    :fetch-priority="fetchPriority"
    @active-slide-change="emit('activeSlideChange', $event)"
  >
    <template #slide="{ image, index }">
      <SFLink
        :to="link"
        raw
        tabindex="-1"
        aria-hidden="true"
        class="relative flex min-h-0 max-w-full min-w-full shrink-0 items-center justify-center"
        data-testid="product-card-image-slider-link"
        @click="emit('selectProduct')"
      >
        <SFProductImage
          :url="image.url"
          :preset="image.preset"
          :alt="image.alt"
          :image-loading="getImageLoading(index)"
          :fetch-priority="index === 0 ? fetchPriority : undefined"
          :apply-padding="image.applyPadding"
          class="mx-auto size-full object-contain"
        />
      </SFLink>
    </template>
  </SFImageStrip>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProductImage } from '@scayle/storefront/types'
import SFImageStrip from '@client/components/ui/core/SFImageStrip.vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import type { ImageSliderImage } from '@client/utils/constants'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import { getProductImageLoading } from '@client/constants'
import type { ImageLoading } from '@client/constants'

const {
  link,
  isProductHovered,
  images,
  productIndex = 0,
  alt,
  fetchPriority,
} = defineProps<{
  link: string
  isProductHovered: boolean
  images: ProductImage[]
  productIndex?: number
  alt: string
  /**
   * Fetch priority for the first image.
   * Only applies to the first image (index 0) when passed.
   */
  fetchPriority?: 'high' | 'low' | 'auto'
}>()

const emit = defineEmits<{
  selectProduct: []
  activeSlideChange: [index: number]
}>()

const imageAlt = (index: number) => `${alt} (${index + 1}/${images.length})`

const sliderImages = computed<ImageSliderImage[]>(() =>
  images.map((image, index) => ({
    url: image.url,
    preset: 'tile' as const,
    alt: imageAlt(index),
    hash: image.url,
    applyPadding: image.applyPadding,
  })),
)

/** Touch capability is fixed for the session, so we detect it once per component init. */
const isTouchDevice =
  !import.meta.env.SSR &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

/**
 * Whether prev/next arrows should exist at all.
 * Arrows are rendered only on non-touch devices with more than one image; their
 * visibility is then driven by `isProductHovered` (see `force-arrows-visible`),
 * so they reveal on hover anywhere over the card, not just over the image.
 *
 * @returns `true` when arrows should be navigable
 */
const hasNavigableArrows = computed(() => !isTouchDevice && images.length > 1)

// Only the first slide of an above-the-fold card is eager; the rest of the
// slider stays lazy since it is revealed on hover/swipe. Follows the same
// canonical rule as the static card image (`getProductImageLoading`).
const getImageLoading = (index: number): ImageLoading =>
  index === 0 ? getProductImageLoading(productIndex) : 'lazy'

const sliderRef = ref<InstanceType<typeof SFImageStrip> | null>(null)

// A new order means the user switched the image view. Start over at the first
// image, the one that view selects, instead of staying on the slide the strip
// was scrolled to. The strip snaps its slides and keys them by URL, so the
// reorder moves the slide elements and the browser re-snaps to the slide it
// showed before. Scrolling after that DOM update (`post`) wins over the
// re-snap; scrolling before it would be undone.
watch(
  () => images,
  () => sliderRef.value?.scrollImageIntoView(0, 'instant'),
  { flush: 'post' },
)

defineExpose({
  scrollImageIntoView: (
    index: number,
    behavior?: 'auto' | 'instant' | 'smooth',
  ) => sliderRef.value?.scrollImageIntoView(index, behavior ?? 'auto'),
})
</script>
