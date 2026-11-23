<template>
  <div
    v-editable="contentElement"
    class="aspect-(--mobile-aspect-ratio) max-w-(--mobile-max-width) overflow-hidden lg:aspect-(--desktop-aspect-ratio) lg:max-w-(--desktop-max-width)"
    :style="cssVars"
  >
    <CmsPicture
      :desktop-sources="desktopSources"
      :mobile-sources="mobileSources"
    >
      <img
        v-if="!imageFailed"
        class="size-full object-cover object-center"
        :src="mobileImage"
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
  ImageComponent as ImageComponentType,
  StoryblokAsset,
} from '@shared/types/cms/storyblok'
import { createStoryblokSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const IMAGE_DIMENSIONS_SEGMENT_PATTERN = /\/(\d+x\d+)\//

const log = createLogger('image')

const { contentElement } = defineProps<{
  contentElement: ImageComponentType
}>()

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()
const imageFailed = ref(false)

// Claim the image's position in document order during setup, so the first CMS
// image becomes the high-priority candidate and the leading images load eagerly
// unless an override is set.
const lcpIndex = useLcpPriority().claim()

// The CMS `isPriorityImage` toggle forces `high` + `eager`; otherwise the
// automatic document-order heuristic in `resolveImagePriority` decides.
const imagePriority = computed(() => {
  const isPriorityImage = contentElement.isPriorityImage
  return resolveImagePriority(lcpIndex, {
    fetchPriority: isPriorityImage ? 'high' : undefined,
    loading: isPriorityImage ? 'eager' : undefined,
  })
})

const desktopImage = computed(() => contentElement.imageDesktop?.filename ?? '')
const mobileImage = computed(() => {
  return contentElement.imageMobile?.filename || desktopImage.value
})
const altText = computed(() => contentElement.altText ?? '')

/** Generates desktop responsive sources based on current CMS viewport context. */
const desktopSources = computed(() => {
  if (!desktopImage.value) {
    return []
  }
  return createStoryblokSources(
    desktopImage.value,
    desktopViewportFraction.value,
  )
})

/** Generates mobile responsive sources based on current CMS viewport context. */
const mobileSources = computed(() => {
  if (!mobileImage.value) {
    return []
  }
  return createStoryblokSources(mobileImage.value, mobileViewportFraction.value)
})

/**
 * Extracts image dimensions from Storyblok asset metadata or filename path.
 * Storyblok stores dimensions as `WIDTHxHEIGHT`.
 *
 * Prefers `meta_data.size` when available. Falls back to matching the
 * `{W}x{H}` segment in the CDN URL via regex so the extraction is resilient
 * to URL structure changes (e.g. `https://a.storyblok.com/f/{space_id}/{WxH}/...`).
 */
const getImageDimensions = (image?: StoryblokAsset) => {
  // Regex matches the first /NxN/ segment in the URL regardless of its position.
  const dimensions =
    image?.meta_data?.size ||
    image?.filename?.match(IMAGE_DIMENSIONS_SEGMENT_PATTERN)?.[1]
  const [width = '0', height = '0'] = dimensions?.split('x') ?? ['0', '0']
  return {
    width: Number.parseInt(width, 10),
    height: Number.parseInt(height, 10),
  }
}

/** Resolves CSS aspect ratio values from Storyblok ratio settings. */
const getAspectRatio = (
  ratio: ImageComponentType['aspectRatioDesktop'],
  image?: StoryblokAsset,
) => {
  switch (ratio) {
    case '16:9':
      return '16/9'
    case '1:1':
      return '1/1'
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
  const mobileDimensions = getImageDimensions(
    contentElement.imageMobile?.filename
      ? contentElement.imageMobile
      : contentElement.imageDesktop,
  )
  const desktopDimensions = getImageDimensions(contentElement.imageDesktop)
  return {
    '--mobile-aspect-ratio': getAspectRatio(
      contentElement.aspectRatioMobile,
      contentElement.imageMobile ?? contentElement.imageDesktop,
    ),
    '--desktop-aspect-ratio': getAspectRatio(
      contentElement.aspectRatioDesktop,
      contentElement.imageDesktop,
    ),
    '--desktop-max-width': `${desktopDimensions.width}px`,
    '--mobile-max-width': `${mobileDimensions.width}px`,
  }
})

const handleImageError = (event: Event) => {
  imageFailed.value = true
  const failedSrc =
    event.target instanceof HTMLImageElement
      ? event.target.currentSrc || event.target.src
      : mobileImage.value

  log.warn({
    message: 'Storyblok image failed to load',
    src: failedSrc,
    contentId: contentElement._uid,
  })
}
</script>
