<template>
  <SFProductImageBase
    data-testid="product-image"
    variant="product"
    :alt="alt"
    :src="resolvedSrc"
    :src-set="resolvedSrcSet"
    :sizes="resolvedSizes"
    :image-loading="imageLoading"
    :fetch-priority="fetchPriority"
    :force-state="forceState"
    :with-mix-blend-darken="withMixBlendDarken"
    :apply-padding="applyPadding"
    :padding-size="paddingSize"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildImageVariant } from '@scayle/storefront/shared'
import SFProductImageBase from '@client/components/product/SFProductImageBase.vue'
import { ProductImageForcedState } from '@client/utils/constants'
import { IMAGE_VARIANTS } from '@shared/constants/imageVariants'
import type { ImageVariantName } from '@shared/constants/imageVariants'
import type { ImageLoading } from '@client/constants'

const {
  url,
  preset,
  srcSet,
  sizes,
  src,
  withMixBlendDarken = true,
  imageLoading,
  fetchPriority,
  forceState,
  applyPadding = false,
  paddingSize,
} = defineProps<{
  /**
   * Absolute CDN base URL (the image's `url`). With `preset`, the component
   * builds the responsive `src`/`srcSet`/`sizes` on the client from this single
   * URL. Takes precedence over the explicit `src`/`srcSet`/`sizes` props.
   */
  url?: string
  /**
   * Responsive preset name (e.g. `'tile'`), chosen next to the component's CSS.
   * Requires `url`; ignored without it.
   */
  preset?: ImageVariantName
  /** Explicit `<img sizes>`, used unless `url` and `preset` are both set. */
  sizes?: string
  /** Alternative text. The error placeholder uses it as its accessible name. */
  alt: string
  /** Native `<img loading>` hint. Defaults to `'lazy'` through `SFProductImageBase`. */
  imageLoading?: ImageLoading
  /**
   * Blends the image with `mix-blend-darken`, so a white image background takes
   * the frame's background color. On by default.
   */
  withMixBlendDarken?: boolean
  /** Explicit `<img srcset>`, used unless `url` and `preset` are both set. */
  srcSet?: string
  /** Explicit image URL, used unless `url` and `preset` are both set. */
  src?: string
  /**
   * Native `<img fetchpriority>` hint. Pass `'high'` only for the page's LCP
   * candidate, since several `'high'` images cancel each other out.
   */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Forces skeleton or error UI (Storybook and tests). */
  forceState?: ProductImageForcedState
  /**
   * Pads the image frame. Read from the image's `applyPadding` attribute, which flags
   * trimmed assets that would otherwise sit flush to the frame.
   */
  applyPadding?: boolean
  /**
   * How much room a padded frame leaves. Use `'compact'` on swatch sized frames.
   * Ignored unless `applyPadding` is set.
   */
  paddingSize?: 'default' | 'compact'
}>()

// With a URL + preset, build the responsive variant on the client from the
// single URL the server shipped; otherwise fall back to the explicit props.
const variant = computed(() =>
  url && preset ? buildImageVariant(url, IMAGE_VARIANTS[preset]) : undefined,
)

const resolvedSrc = computed(() => variant.value?.src ?? src)
const resolvedSrcSet = computed(() => variant.value?.srcSet ?? srcSet)
const resolvedSizes = computed(() => variant.value?.sizes ?? sizes)
</script>
