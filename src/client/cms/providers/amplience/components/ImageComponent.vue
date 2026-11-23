<template>
  <div
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="image_desktop"
    class="aspect-(--mobile-aspect-ratio) overflow-hidden lg:aspect-(--desktop-aspect-ratio)"
    :style="cssVars"
  >
    <CmsPicture
      :desktop-sources="desktopSources"
      :mobile-sources="mobileSources"
    >
      <img
        v-if="!imageFailed && fallbackSrc"
        class="size-full object-cover object-center"
        :src="fallbackSrc"
        :alt="altText"
        :fetchpriority="imagePriority.fetchPriority"
        :loading="imagePriority.loading"
        @error="handleImageError"
      />
    </CmsPicture>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import { useCMSContext } from '@client/cms/shared/useCMSContext'
import {
  resolveImagePriority,
  useLcpPriority,
} from '@client/cms/shared/useLcpPriority'
import type {
  AspectRatioDesktop,
  ImageComponent as ImageComponentType,
} from '@shared/types/cms/amplience'
import {
  buildAmplienceFallbackSrc,
  createAmplienceSources,
} from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const log = createLogger('image')

const { contentElement } = defineProps<{
  contentElement: ImageComponentType
}>()

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()
const imageFailed = ref(false)

// Claim the image's position in document order during setup, so the first CMS
// image becomes the high-priority candidate and the leading images load eagerly.
const lcpIndex = useLcpPriority().claim()

const imagePriority = computed(() => resolveImagePriority(lcpIndex, {}))

const desktopImage = computed(() => contentElement.image_desktop)

/** Amplience treats the mobile image as optional, falling back to desktop. */
const mobileImage = computed(
  () => contentElement.image_mobile ?? desktopImage.value,
)

const altText = computed(() => contentElement.alt_text ?? '')

const fallbackSrc = computed(() => {
  const image = mobileImage.value ?? desktopImage.value
  return image ? buildAmplienceFallbackSrc(image) : ''
})

const desktopSources = computed(() => {
  if (!desktopImage.value) {
    return []
  }
  return createAmplienceSources(
    desktopImage.value,
    desktopViewportFraction.value,
  )
})

const mobileSources = computed(() => {
  if (!mobileImage.value) {
    return []
  }
  return createAmplienceSources(mobileImage.value, mobileViewportFraction.value)
})

/**
 * Resolves a CSS aspect ratio from the Amplience ratio setting.
 *
 * Amplience image links carry no intrinsic dimensions, so `original` cannot be
 * computed client-side the way it can for Storyblok (which encodes `WxH` in the
 * CDN path). `auto` lets the loaded image establish its own ratio instead.
 */
const getAspectRatio = (ratio: AspectRatioDesktop | undefined): string => {
  switch (ratio) {
    case '16:9':
      return '16/9'
    case '1:1':
      return '1/1'
    case '4:3':
      return '4/3'
    case '3:4':
      return '3/4'
    case 'original':
    default:
      return 'auto'
  }
}

/** Creates CSS variables consumed by Tailwind arbitrary values in the template. */
const cssVars = computed(() => ({
  '--mobile-aspect-ratio': getAspectRatio(
    contentElement.aspect_ratio_mobile ?? contentElement.aspect_ratio_desktop,
  ),
  '--desktop-aspect-ratio': getAspectRatio(contentElement.aspect_ratio_desktop),
}))

const handleImageError = (event: Event) => {
  imageFailed.value = true
  const failedSrc =
    event.target instanceof HTMLImageElement
      ? event.target.currentSrc || event.target.src
      : fallbackSrc.value

  log.warn({
    message: 'Amplience image failed to load',
    src: failedSrc,
    contentId: contentElement._meta?.deliveryId,
  })
}
</script>
