<template>
  <div
    class="group relative block overflow-hidden"
    :class="frameClass"
    :style="frameStyle"
  >
    <div
      v-if="showError"
      data-testid="product-image-error"
      class="flex size-full flex-col items-center justify-center bg-product-image-background"
      role="img"
      :aria-label="alt"
    >
      <IconImagePlaceholder
        class="w-[40%] max-w-18 text-gray-300"
        aria-hidden="true"
      />
    </div>

    <SFSkeletonLoader
      v-else-if="showForcedSkeleton"
      data-testid="product-image-skeleton"
      :type="SkeletonType.CUSTOM"
      full-width
      class="size-full min-h-0 rounded-md bg-product-image-background"
      aria-hidden="true"
    />

    <template v-else-if="src">
      <!--
        One image at multiple resolutions — `<img srcset sizes>` is enough: the
        browser just picks the best-resolution version of the SAME image for the
        viewport. `<picture>` is only needed to serve a DIFFERENT image per
        breakpoint (e.g. a different crop) or a different file format with a
        fallback — which the CMS image components do, but this one does not.
      -->
      <img
        ref="imageRef"
        :src="src"
        :srcset="srcSet"
        :sizes="sizes"
        :alt="alt"
        :loading="imageLoading"
        :fetchpriority="fetchPriority"
        :class="[imgClass, { invisible: !imageLoaded }]"
        :aria-hidden="!imageLoaded"
        @load="onImageLoad"
        @error="handleImageError"
      />

      <SFSkeletonLoader
        v-if="showSkeletonOverlay"
        data-testid="product-image-skeleton"
        :type="SkeletonType.CUSTOM"
        full-width
        class="absolute inset-0 z-10 size-full min-h-0 rounded-md bg-product-image-background"
        aria-hidden="true"
      />

      <div
        v-if="variant === 'product' && imageLoaded"
        class="pointer-events-none absolute inset-0 bg-primary/10 opacity-0 transition-opacity"
        aria-hidden="true"
      />
    </template>

    <div
      v-if="variant === 'thumbnail' && disabled"
      data-testid="product-thumbnail-strikethrough"
      class="pointer-events-none absolute inset-0 z-20 rounded-md text-gray-400 diagonal-strikethrough"
      aria-hidden="true"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { StyleValue } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import IconImagePlaceholder from '@assets/icons/utility/image-placeholder.svg'
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
import { PRODUCT_IMAGE_ASPECT_RATIO } from '@client/constants'
import type { ImageLoading } from '@client/constants'
import { ProductImageForcedState, SkeletonType } from '@client/utils/constants'
import { isInitialRender } from '@client/utils/initialRender'

const log = createLogger('image')

const PRODUCT_FRAME_BASE =
  'isolate h-full min-h-0 w-full overflow-hidden rounded-md bg-product-image-background'

const THUMBNAIL_FRAME_BASE =
  'size-full min-h-0 overflow-hidden rounded-xl bg-product-image-background focus-within:focus-style-inset'

// How much room a padded frame leaves around the image. `applyPadding` decides
// whether to pad at all; the amount is a per-surface choice, because the swatch
// sized frames are too small for the default step.
const PADDING_CLASS = {
  default: 'p-4',
  compact: 'p-1',
} as const

const {
  variant,
  alt,
  src,
  srcSet,
  sizes,
  imageLoading = 'lazy',
  fetchPriority,
  forceState,
  fit = 'contain',
  withMixBlendDarken = false,
  selected = false,
  disabled = false,
  applyPadding = false,
  paddingSize = 'default',
} = defineProps<{
  /**
   * `'product'` frames the image at `PRODUCT_IMAGE_ASPECT_RATIO` and tints it on
   * hover. `'thumbnail'` fills its parent and draws the border that shows
   * `selected` and `disabled`.
   */
  variant: 'product' | 'thumbnail'
  /** Alternative text. The error placeholder uses it as its accessible name. */
  alt: string
  /** Image URL. Without it, the error placeholder shows. */
  src?: string
  /** Native `<img srcset>`: the same image at several widths. */
  srcSet?: string
  /** Native `<img sizes>`: the rendered width the browser picks a `srcSet` candidate for. */
  sizes?: string
  /**
   * Native `<img loading>` hint. This leaf is position-agnostic, so it defaults
   * to the safe `'lazy'`. Position-aware callers (product cards, galleries)
   * decide when an image is above the fold and pass `'eager'`, following the
   * canonical `getProductImageLoading` rule in `@client/constants`.
   */
  imageLoading?: ImageLoading
  /**
   * Native `<img fetchpriority>` hint. Pass `'high'` only for the page's LCP
   * candidate, since several `'high'` images cancel each other out.
   */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Forces skeleton or error UI (Storybook and tests). */
  forceState?: ProductImageForcedState
  /**
   * `'contain'` shows the whole image, `'cover'` fills the frame and crops it.
   * The thumbnail variant always uses `'contain'`.
   */
  fit?: 'contain' | 'cover'
  /**
   * Blends the image with `mix-blend-darken`, so a white image background takes
   * the frame's background color. Skipped on a disabled thumbnail.
   */
  withMixBlendDarken?: boolean
  /** Marks the active thumbnail with a primary border. Thumbnail variant only. */
  selected?: boolean
  /**
   * Mutes the image and strikes it through, as for a sold-out sibling.
   * Thumbnail variant only.
   */
  disabled?: boolean
  /**
   * Pads the image frame. Set from the image's `applyPadding` attribute, which flags
   * trimmed assets that would otherwise sit flush to the frame.
   */
  applyPadding?: boolean
  /**
   * How much room a padded frame leaves. Use `'compact'` on swatch sized frames,
   * where the default step would leave almost no product visible. The thumbnail
   * variant always receives `'compact'` from `SFProductThumbnail`, since every
   * thumbnail preset is swatch sized. Ignored unless `applyPadding` is set.
   */
  paddingSize?: keyof typeof PADDING_CLASS
}>()

// Starts visible on the initial render since an SSR'd image is never actually "loading" from the browser's perspective — hiding it until @load would cost LCP for no reason.
const imageLoaded = ref(isInitialRender())
// Tracks whether @load has actually fired, independent of imageLoaded — needed because imageLoaded can start true on initial render, so it can no longer double as "the load event already happened."
const loadEventFired = ref(false)
const imageFailed = ref(false)
const imageRef = useTemplateRef<HTMLImageElement>('imageRef')

watch(
  () => src,
  () => {
    imageLoaded.value = false
    loadEventFired.value = false
    imageFailed.value = false
  },
)

const aspectRatioStyle = computed((): StyleValue => ({
  aspectRatio: `${PRODUCT_IMAGE_ASPECT_RATIO[0]} / ${PRODUCT_IMAGE_ASPECT_RATIO[1]}`,
}))

const thumbnailBorderClass = computed(() => {
  if (disabled) {
    return 'border-2 border-disabled-border bg-disabled-background'
  }
  if (selected) {
    return 'border-2 border-primary'
  }
  return ['border-2 border-transparent', 'hover:border-primary']
})

const frameClass = computed(() => {
  const padding = applyPadding && PADDING_CLASS[paddingSize]

  if (variant === 'thumbnail') {
    return [
      THUMBNAIL_FRAME_BASE,
      padding,
      thumbnailBorderClass.value,
      withMixBlendDarken && !disabled && 'isolate',
    ]
  }

  return [PRODUCT_FRAME_BASE, padding]
})

const frameStyle = computed(() => {
  if (variant !== 'product') {
    return undefined
  }
  return aspectRatioStyle.value
})

const imgClass = computed(() => {
  const blend = {
    'mix-blend-darken':
      withMixBlendDarken && !(variant === 'thumbnail' && disabled),
  }

  if (variant === 'thumbnail') {
    return [
      'mx-auto h-full max-h-full w-auto max-w-full object-contain',
      { 'opacity-25': disabled },
      blend,
    ]
  }

  if (fit === 'cover') {
    return ['size-full object-cover object-center', blend]
  }

  return ['mx-auto h-full max-h-full w-auto max-w-full object-contain', blend]
})

const showForcedSkeleton = computed(
  () => forceState === ProductImageForcedState.SKELETON,
)

const showError = computed(() => {
  if (forceState === ProductImageForcedState.ERROR) {
    return true
  }
  if (showForcedSkeleton.value) {
    return false
  }
  return imageFailed.value || !src
})

const showSkeletonOverlay = computed(() => {
  if (showForcedSkeleton.value || showError.value) {
    return false
  }
  return Boolean(src) && !imageLoaded.value
})

const onImageLoad = () => {
  imageLoaded.value = true
  loadEventFired.value = true
}

/**
 * Aligns UI when the browser finished loading before Vue attached listeners
 * (e.g. eager thumbnails or blocked CDN images).
 */
const syncImageElementState = () => {
  const img = imageRef.value
  if (!img?.complete) {
    return
  }
  if (img.naturalWidth > 0) {
    onImageLoad()
    return
  }
  imageFailed.value = true
}

watch(imageRef, async (img) => {
  // Skip if the load event already fired via the @load event. A later ref flush
  // can still reach syncImageElementState(), where naturalWidth === 0 (SVGs
  // have no intrinsic size) would incorrectly flip imageFailed to true.
  if (!img || loadEventFired.value) {
    return
  }
  await nextTick()
  syncImageElementState()
})

const handleImageError = (event: Event) => {
  imageFailed.value = true
  const failedSrc =
    event.target instanceof HTMLImageElement
      ? event.target.currentSrc || event.target.src
      : src

  log.warn({ message: 'Product image failed to load', src: failedSrc })
}
</script>
