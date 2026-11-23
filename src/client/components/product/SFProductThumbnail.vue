<template>
  <div class="relative" :class="[thumbnailRootSizeClass]">
    <!--
      Every thumbnail preset is swatch sized (40-60px), so the default padding
      step would leave almost no product visible. The step is pinned here rather
      than exposed as a prop.
    -->
    <SFProductImageBase
      data-testid="product-thumbnail"
      variant="thumbnail"
      padding-size="compact"
      class="size-full"
      :alt="alt"
      :src="resolvedSrc"
      :src-set="resolvedSrcSet"
      :sizes="resolvedSizes"
      :image-loading="imageLoading"
      :fetch-priority="fetchPriority"
      :force-state="forceState"
      :selected="selected"
      :disabled="disabled"
      :apply-padding="applyPadding"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildImageVariant } from '@scayle/storefront/shared'
import SFProductImageBase from '@client/components/product/SFProductImageBase.vue'
import {
  ProductImageForcedState,
  THUMBNAIL_ROOT_SIZE,
  ThumbnailSize,
} from '@client/utils/constants'
import { IMAGE_VARIANTS } from '@shared/constants/imageVariants'
import type { ImageVariantName } from '@shared/constants/imageVariants'
import type { ImageLoading } from '@client/constants'

const {
  url,
  preset,
  srcSet,
  sizes,
  src,
  imageLoading,
  fetchPriority,
  thumbnailSize = ThumbnailSize.LG,
  selected = false,
  disabled = false,
  forceState,
  applyPadding = false,
} = defineProps<{
  /**
   * Absolute CDN base URL (the image's `url`). With `preset`, the component
   * builds the responsive `src`/`srcSet`/`sizes` on the client from this single
   * URL. Takes precedence over the explicit `src`/`srcSet`/`sizes` props.
   */
  url?: string
  /**
   * Responsive preset name (e.g. `'thumbnail'`), chosen next to the component's
   * CSS. Requires `url`; ignored without it.
   */
  preset?: ImageVariantName
  /** Explicit `<img sizes>`, used unless `url` and `preset` are both set. */
  sizes?: string
  /** Alternative text. The error placeholder uses it as its accessible name. */
  alt: string
  /** Native `<img loading>` hint. Defaults to `'lazy'` through `SFProductImageBase`. */
  imageLoading?: ImageLoading
  /** Explicit `<img srcset>`, used unless `url` and `preset` are both set. */
  srcSet?: string
  /** Explicit image URL, used unless `url` and `preset` are both set. */
  src?: string
  /**
   * Native `<img fetchpriority>` hint. Pass `'high'` only for the page's LCP
   * candidate, since several `'high'` images cancel each other out.
   */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Thumbnail size preset (Figma: Small, Medium, Large). */
  thumbnailSize?: ThumbnailSize
  /** Selected / active thumbnail (primary border). */
  selected?: boolean
  /** Disabled thumbnail (muted image, disabled border). */
  disabled?: boolean
  /** Forces skeleton or error UI (Storybook and tests). */
  forceState?: ProductImageForcedState
  /**
   * Pads the thumbnail frame. Set from the image's `applyPadding` attribute, which
   * flags trimmed assets that would otherwise sit flush to the frame. Thumbnails
   * always use the compact step.
   */
  applyPadding?: boolean
}>()

const thumbnailRootSizeClass = computed(
  () => THUMBNAIL_ROOT_SIZE[thumbnailSize],
)

// With a URL + preset, build the responsive variant on the client from the
// single URL the server shipped; otherwise fall back to the explicit props.
const variant = computed(() =>
  url && preset ? buildImageVariant(url, IMAGE_VARIANTS[preset]) : undefined,
)

const resolvedSrc = computed(() => variant.value?.src ?? src)
const resolvedSrcSet = computed(() => variant.value?.srcSet ?? srcSet)
const resolvedSizes = computed(() => variant.value?.sizes ?? sizes)
</script>
