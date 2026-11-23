<template>
  <div
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="imageDesktop"
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
        :src="fallbackImage"
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
import type { TypeImageComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { createContentfulSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'

const log = createLogger('image')

const { contentElement } = defineProps<{
  contentElement: TypeImageComponentWithoutUnresolvableLinksResponse
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
  const isPriorityImage = contentElement.fields?.isPriorityImage
  return resolveImagePriority(lcpIndex, {
    fetchPriority: isPriorityImage ? 'high' : undefined,
    loading: isPriorityImage ? 'eager' : undefined,
  })
})

/** Extracts the desktop image URL from the Contentful asset. */
const desktopImage = computed(
  () => contentElement.fields?.imageDesktop?.fields?.file?.url ?? '',
)

/** Extracts the mobile image URL, falling back to the desktop image. */
const mobileImage = computed(
  () =>
    contentElement.fields?.imageMobile?.fields?.file?.url ?? desktopImage.value,
)

/** Provides the fallback src for the img element. */
const fallbackImage = computed(() => mobileImage.value || desktopImage.value)

/** Reads alt text from the Contentful field. */
const altText = computed(() => contentElement.fields?.altText ?? '')

/** Generates desktop responsive sources based on current CMS viewport context. */
const desktopSources = computed(() => {
  if (!desktopImage.value) {
    return []
  }
  return createContentfulSources(
    desktopImage.value,
    desktopViewportFraction.value,
  )
})

/** Generates mobile responsive sources based on current CMS viewport context. */
const mobileSources = computed(() => {
  if (!mobileImage.value) {
    return []
  }
  return createContentfulSources(
    mobileImage.value,
    mobileViewportFraction.value,
  )
})

/**
 * Extracts image dimensions from a Contentful asset metadata.
 * Returns width and height from the file details, defaulting to 0.
 */
const getImageDimensions = (
  image:
    | TypeImageComponentWithoutUnresolvableLinksResponse['fields']['imageDesktop']
    | TypeImageComponentWithoutUnresolvableLinksResponse['fields']['imageMobile'],
) => {
  return {
    width: image?.fields?.file?.details?.image?.width ?? 0,
    height: image?.fields?.file?.details?.image?.height ?? 0,
  }
}

/** Resolves CSS aspect ratio values from Contentful ratio settings. */
const getAspectRatio = (
  ratio:
    | TypeImageComponentWithoutUnresolvableLinksResponse['fields']['aspectRatioDesktop']
    | TypeImageComponentWithoutUnresolvableLinksResponse['fields']['aspectRatioMobile'],
  image:
    | TypeImageComponentWithoutUnresolvableLinksResponse['fields']['imageDesktop']
    | TypeImageComponentWithoutUnresolvableLinksResponse['fields']['imageMobile'],
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
  const mobileAsset =
    contentElement.fields?.imageMobile ?? contentElement.fields?.imageDesktop
  const desktopAsset = contentElement.fields?.imageDesktop
  const mobileDimensions = getImageDimensions(mobileAsset)
  const desktopDimensions = getImageDimensions(desktopAsset)
  return {
    '--mobile-aspect-ratio': getAspectRatio(
      contentElement.fields?.aspectRatioMobile,
      mobileAsset,
    ),
    '--desktop-aspect-ratio': getAspectRatio(
      contentElement.fields?.aspectRatioDesktop,
      desktopAsset,
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
      : fallbackImage.value

  log.warn({
    message: 'Contentful image failed to load',
    src: failedSrc,
    entryId: contentElement.sys?.id,
  })
}
</script>
