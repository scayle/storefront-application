<template>
  <Head v-if="firstGalleryImagePreload || zoomImagePreloads[0]">
    <link
      v-if="firstGalleryImagePreload"
      rel="preload"
      as="image"
      :href="firstGalleryImagePreload.src"
      :imagesrcset="firstGalleryImagePreload.srcSet"
      :imagesizes="firstGalleryImagePreload.sizes"
      fetchpriority="high"
    />
    <link
      v-if="zoomImagePreloads[0]"
      rel="preload"
      as="image"
      :href="zoomImagePreloads[0].src"
      :imagesrcset="zoomImagePreloads[0].srcSet"
      :imagesizes="zoomImagePreloads[0].sizes"
      fetchpriority="low"
    />
    <link
      v-for="preload in zoomImagePreloads.slice(1)"
      :key="preload.src"
      rel="preload"
      as="image"
      :href="preload.src"
      :imagesrcset="preload.srcSet"
      :imagesizes="preload.sizes"
      media="(min-width: 1024px)"
      fetchpriority="low"
    />
  </Head>
  <div v-bind="$attrs" class="relative w-full" data-testid="product-gallery">
    <!--
      Both layouts stay in the DOM and toggle by CSS breakpoint: the mobile
      swipe slider below 640px, the mixed-media grid from 640px up. Playback is
      additionally gated in JS (`isDesktopGrid`), since the hidden layout would
      otherwise still bind `src` and autoplay its video.
    -->
    <div class="sm:hidden">
      <SFImageGallery
        id="image"
        :images="sliderImages"
        :with-arrows="hasNavigableArrows"
        fetch-priority="high"
        :aria-label="product.name"
        data-testid="main-product-image"
        @slide-click="onMediaActivate"
      >
        <template #slide="{ image, index, isActive }">
          <SFProductVideoSlide
            v-if="media[index]?.type === 'video'"
            :url="media[index].url"
            :poster-url="media[index].posterUrl"
            :alt="image.alt"
            :is-playing="!isDesktopGrid && isActive"
            @play="playVideoAt(index)"
          />
          <SFProductImage
            v-else
            :url="image.url"
            :preset="image.preset"
            :alt="image.alt"
            :image-loading="index === 0 ? 'eager' : 'lazy'"
            :fetch-priority="index === 0 ? 'high' : undefined"
            :apply-padding="image.applyPadding"
            class="size-full max-sm:rounded-none!"
            @click="onMediaActivate(index)"
          />
        </template>
      </SFImageGallery>
    </div>
    <div class="hidden sm:block">
      <SFProductImageGrid
        :items="media"
        :product-name="product.name"
        :playing-video-index="isDesktopGrid ? playingVideoIndex : undefined"
        @enlarge="onMediaActivate"
        @play-video="playVideoAt"
      />
    </div>
    <!--
      Overlays sit over the primary image, which is the top-left of both layouts
      (the full-bleed slide on mobile, the first grid tile from 640px up), so one
      absolutely-positioned set serves both. The wishlist toggle stays until the
      buy row in SFProductActions takes over from 1024px up.
    -->
    <SFBackButton
      use-history-back
      :fallback-link="product.mainCategory?.link"
      class="absolute top-5 left-4 z-10 -ml-3 lg:hidden"
      data-testid="back-button"
    />
    <SFWishlistToggle
      class="absolute top-5 right-2 z-10 mr-1.5 bg-transparent! lg:hidden [&>span]:size-6"
      icon-class="size-6!"
      resting-icon-class="fill-primary"
      :product="product"
      :product-list-type="null"
      :product-list-id="null"
    />
    <SFProductBadges
      class="absolute left-5 z-10 max-sm:bottom-5 sm:top-16 lg:top-5"
      :product="product"
    />
  </div>
  <!-- Keeps setup() out of SSR, so withModulePreloads doesn't preload its chunk, and stays mounted across close/reopen so transitions survive. -->
  <SFProductGalleryZoom
    v-if="hasOpenedZoom"
    v-model:visible="isZoomModalOpen"
    :alt="product.name"
    :items="media"
    :current-slide-index="zoomMediaIndex"
    @close="isZoomModalOpen = false"
    @update:slide="updateZoomMediaIndex"
  />
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-detail-page
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import { useMounted } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { buildImageVariant } from '@scayle/storefront/shared'
import type { DetailedProduct } from '@scayle/storefront/types'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import SFProductBadges from '@client/components/product/SFProductBadges.vue'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import SFProductImageGrid from '@client/components/product/detail/productGallery/SFProductImageGrid.vue'
import SFProductVideoSlide from '@client/components/product/detail/productGallery/SFProductVideoSlide.vue'
import SFImageGallery from '@client/components/ui/core/SFImageGallery.vue'
import type { ImageSliderImage } from '@client/utils/constants'
import SFBackButton from '@client/components/ui/navigation/SFBackButton.vue'
import { IMAGE_VARIANTS } from '@shared/constants/imageVariants'
import {
  buildGalleryTilePresets,
  buildProductGalleryMedia,
  GALLERY_ZOOM_PRESET,
} from '@shared/utils/productGalleryMedia'
import SFWishlistToggle from '../../SFWishlistToggle.vue'

const SFProductGalleryZoom = defineAsyncComponent(
  () =>
    import('@client/components/product/detail/productGallery/SFProductGalleryZoom.vue'),
)

/**
 * Multi-root template (the gallery wrapper `div` plus the zoom modal).
 * Fallthrough attributes bind to the wrapper, the always-present container.
 */
defineOptions({ inheritAttrs: false })

const { product } = defineProps<{
  /**
   * The product.
   */
  product: DetailedProduct
}>()

const { t } = useI18n()

const breakpoints = useDefaultBreakpoints()
const isDesktopGrid = breakpoints.greaterOrEqual('sm')

const media = computed(() =>
  buildProductGalleryMedia(product.images, product.videos),
)

const isMounted = useMounted()

/** Touch capability is fixed for the session, so we detect it once per component init. */
const isTouchDevice =
  !import.meta.env.SSR &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

// The slider reveals its arrows on hover, and a tap fires a compatibility
// `mouseover` too. iOS Safari drops the click of a tap whose hover reveals
// content, so the first tap on a slide would not open the zoom. Touch devices
// swipe instead, as on the product card slider. The server cannot detect touch,
// so the arrows join after mount and the first client render matches SSR.
const hasNavigableArrows = computed(
  () => isMounted.value && !isTouchDevice && media.value.length > 1,
)

// Slides reuse the grid tile presets. Every tile preset is full-bleed below
// 640px, where the slider shows, and sharing them makes the first image of the
// hidden layout resolve to the URL the visible one already fetched.
const tilePresets = computed(() => buildGalleryTilePresets(media.value.length))

const firstGalleryImagePreload = computed(() => {
  const first = media.value[0]
  const preset = tilePresets.value[0]
  if (first?.type !== 'image' || !preset) {
    return undefined
  }
  return buildImageVariant(first.url, IMAGE_VARIANTS[preset])
})

const sliderImages = computed<ImageSliderImage[]>(() =>
  media.value.map((item, index) => ({
    url: item.type === 'image' ? item.url : (item.posterUrl ?? item.url),
    // `buildGalleryTilePresets` returns one preset per media item.
    preset: tilePresets.value[index]!,
    alt:
      item.type === 'video'
        ? t('product_video.a11y.slide_label', {
            name: product.name,
            index: index + 1,
            total: media.value.length,
          })
        : t('product_image.alt_with_image_index', {
            alt: product.name,
            index: index + 1,
            total: media.value.length,
          }),
    hash: item.url,
    applyPadding: item.type === 'image' ? item.applyPadding : false,
  })),
)

const zoomMediaIndex = ref(0)
const playingVideoIndex = ref<number | undefined>()
const isZoomModalOpen = ref(false)
const hasOpenedZoom = ref(false)

const firstVideoIndex = computed(() =>
  media.value.findIndex((item) => item.type === 'video'),
)

watch(
  [isDesktopGrid, firstVideoIndex],
  ([desktop, videoIndex]) => {
    if (desktop) {
      playingVideoIndex.value = videoIndex === -1 ? undefined : videoIndex
      return
    }
    playingVideoIndex.value = undefined
  },
  { immediate: true },
)

const updateZoomMediaIndex = (newSlide: number) => {
  zoomMediaIndex.value = Number.isFinite(newSlide) ? newSlide : 0
}

const playVideoAt = (index: number) => {
  const item = media.value[index]
  if (item?.type !== 'video') {
    return
  }
  playingVideoIndex.value = index
}

// The zoom view shows the `galleryZoom` variant, a larger file than any gallery
// tile, which the CDN may still have to generate on the first request.
// Preloading the zoom images at low priority lets the zoom view open from the
// browser cache instead of waiting for it. Below 1024px the zoom view's `sizes`
// fill twice the viewport width, so most screens there pick the 2048px file,
// too large to load for every image. The zoom view opens from the first image
// more often than from any other, so only that one preloads there. Its link
// stays out of the `v-for`, because Inertia's head renders an unset `media`
// as `media="undefined"`, which matches no viewport.
const zoomImagePreloads = computed(() =>
  media.value
    .filter((item) => item.type === 'image')
    .map((item) =>
      buildImageVariant(item.url, IMAGE_VARIANTS[GALLERY_ZOOM_PRESET]),
    ),
)

const previouslyPlayingVideoIndex = ref<number | undefined>()
const onMediaActivate = (index: number) => {
  const item = media.value[index]
  if (!item) {
    return
  }
  if (item.type === 'video') {
    playVideoAt(index)
    return
  }
  previouslyPlayingVideoIndex.value = playingVideoIndex.value
  playingVideoIndex.value = undefined
  zoomMediaIndex.value = index
  isZoomModalOpen.value = true
  hasOpenedZoom.value = true
}

watch(isZoomModalOpen, (isNowOpen) => {
  if (!isNowOpen && isDesktopGrid.value) {
    playingVideoIndex.value = previouslyPlayingVideoIndex.value
  }
})
</script>
