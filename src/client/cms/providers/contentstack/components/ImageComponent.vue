<template>
  <div
    v-live-preview:image_desktop="contentElement"
    class="aspect-(--mobile-aspect-ratio) max-h-(--mobile-max-height) max-w-(--mobile-max-width) overflow-hidden lg:aspect-(--desktop-aspect-ratio) lg:max-h-(--desktop-max-height) lg:max-w-(--desktop-max-width)"
    :style="cssVars"
  >
    <CmsPicture
      :desktop-sources="desktopSources"
      :mobile-sources="mobileSources"
    >
      <img
        class="size-full object-cover object-center"
        :src="fallbackImage"
        :alt="altText"
        :fetchpriority="imagePriority.fetchPriority"
        :loading="imagePriority.loading"
      />
    </CmsPicture>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCMSContext } from '@client/cms/shared/useCMSContext'
import {
  resolveImagePriority,
  useLcpPriority,
} from '@client/cms/shared/useLcpPriority'
import type { ImageComponent, File } from '@shared/types/cms/contentstack'
import { createContentstackSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const { contentElement } = defineProps<{
  contentElement: ImageComponent
}>()

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

// Claim the image's position in document order during setup, so the first CMS
// image becomes the high-priority candidate and the leading images load eagerly
// unless an override is set.
const lcpIndex = useLcpPriority().claim()

// The CMS `is_priority_image` toggle forces `high` + `eager`; otherwise the
// automatic document-order heuristic in `resolveImagePriority` decides.
const imagePriority = computed(() => {
  const isPriorityImage = contentElement.is_priority_image
  return resolveImagePriority(lcpIndex, {
    fetchPriority: isPriorityImage ? 'high' : undefined,
    loading: isPriorityImage ? 'eager' : undefined,
  })
})

/** Extracts the desktop image URL from the Contentstack asset. */
const desktopImage = computed(() => contentElement.image_desktop?.url ?? '')

/** Extracts the mobile image URL, falling back to the desktop image. */
const mobileImage = computed(
  () => contentElement.image_mobile?.url ?? desktopImage.value,
)

/** Provides the fallback src for the img element. */
const fallbackImage = computed(() => mobileImage.value || desktopImage.value)

/** Reads alt text from the Contentstack field. */
const altText = computed(() => contentElement.alt_text ?? '')

/** Generates desktop responsive sources based on current CMS viewport context. */
const desktopSources = computed(() => {
  if (!desktopImage.value) {
    return []
  }
  return createContentstackSources(
    desktopImage.value,
    desktopViewportFraction.value,
  )
})

/** Generates mobile responsive sources based on current CMS viewport context. */
const mobileSources = computed(() => {
  if (!mobileImage.value) {
    return []
  }
  return createContentstackSources(
    mobileImage.value,
    mobileViewportFraction.value,
  )
})

/**
 * Extracts image dimensions from a Contentstack asset.
 * Returns width and height from the file dimension, defaulting to 0.
 */
const getImageDimensions = (image: File | null | undefined) => {
  return {
    width: image?.dimension?.width ?? 0,
    height: image?.dimension?.height ?? 0,
  }
}

/** Resolves CSS aspect ratio values from Contentstack ratio settings. */
const getAspectRatio = (
  ratio:
    | ImageComponent['aspect_ratio_desktop']
    | ImageComponent['aspect_ratio_mobile'],
  image: File | null | undefined,
) => {
  switch (ratio) {
    case '16:9':
      return '16/9'
    case '1:1':
      return '1/1'
    case '3:4':
      return '3/4'
    case '4:3':
      return '4/3'
    case 'original':
    default: {
      const { width, height } = getImageDimensions(image)
      return `${width}/${height}`
    }
  }
}

/** Creates CSS variables consumed by Tailwind arbitrary values in the template. */
const cssVars = computed(() => {
  const mobileAsset =
    contentElement.image_mobile ?? contentElement.image_desktop
  const desktopAsset = contentElement.image_desktop
  const mobileDimensions = getImageDimensions(mobileAsset)
  const desktopDimensions = getImageDimensions(desktopAsset)
  return {
    '--mobile-aspect-ratio': getAspectRatio(
      contentElement.aspect_ratio_mobile,
      mobileAsset,
    ),
    '--desktop-aspect-ratio': getAspectRatio(
      contentElement.aspect_ratio_desktop,
      desktopAsset,
    ),
    '--desktop-max-height': `${desktopDimensions.height}px`,
    '--desktop-max-width': `${desktopDimensions.width}px`,
    '--mobile-max-height': `${mobileDimensions.height}px`,
    '--mobile-max-width': `${mobileDimensions.width}px`,
  }
})
</script>
