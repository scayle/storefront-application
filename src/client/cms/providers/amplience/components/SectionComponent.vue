<template>
  <section
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    class="relative isolate min-h-(--min-height-mobile) w-full overflow-hidden lg:min-h-(--min-height-desktop)"
    :style="{
      '--min-height-desktop': minHeightDesktop,
      '--min-height-mobile': minHeightMobile,
      backgroundColor,
      display: 'grid',
      gridTemplateAreas: '\'stack\'',
    }"
  >
    <CmsPicture
      v-if="hasBackgroundImage"
      :desktop-sources="desktopBackgroundSources"
      :mobile-sources="mobileBackgroundSources"
      class="absolute inset-0 size-full object-cover object-center"
      style="grid-area: stack"
    >
      <img
        class="size-full object-cover object-center"
        :src="backgroundFallbackSrc"
        role="presentation"
        alt=""
        :fetchpriority="imagePriority.fetchPriority"
        :loading="imagePriority.loading"
      />
    </CmsPicture>

    <div
      class="relative z-10 flex size-full flex-col overflow-hidden"
      :class="[paddingClasses, horizontalContentAlignment]"
      style="grid-area: stack"
    >
      <AmplienceBlockDispatch
        v-for="(nestedBlock, index) in nestedBlocks"
        :key="getBlockKey(nestedBlock, index)"
        :content-element="nestedBlock"
        :class="{
          'mt-auto': shouldAddTopMargin(
            index,
            contentElement.vertical_content_alignment,
          ),
          'mb-auto': shouldAddBottomMargin(
            index,
            nestedBlocks.length,
            contentElement.vertical_content_alignment,
          ),
        }"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveFlexAlignmentClass,
  resolvePaddingClass,
  shouldAddBottomMargin,
  shouldAddTopMargin,
} from '@client/cms/shared/alignment'
import { useCMSContext } from '@client/cms/shared/useCMSContext'
import {
  resolveImagePriority,
  useLcpPriority,
} from '@client/cms/shared/useLcpPriority'
import type { SectionComponent as SectionComponentType } from '@shared/types/cms/amplience'
import { extractBlocks, getBlockKey } from '../utils/blocks'
import {
  buildAmplienceFallbackSrc,
  createAmplienceSources,
} from '../utils/media'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'
import CmsPicture from './CmsPicture.vue'

const { contentElement } = defineProps<{
  contentElement: SectionComponentType
}>()

const nestedBlocks = computed(() => extractBlocks(contentElement.content))

const paddingClasses = computed(() =>
  resolvePaddingClass(contentElement.padding),
)

const horizontalContentAlignment = computed(() =>
  resolveFlexAlignmentClass(contentElement.horizontal_content_alignment),
)

const minHeightDesktop = computed(
  () => `${contentElement.min_height_desktop ?? 0}px`,
)

/** Mobile falls back to the desktop height when the author sets only one. */
const minHeightMobile = computed(
  () =>
    `${contentElement.min_height_mobile ?? contentElement.min_height_desktop ?? 0}px`,
)

const backgroundColor = computed(
  () => contentElement.background_color || undefined,
)

const desktopBackgroundImage = computed(
  () => contentElement.background_image_desktop,
)

const mobileBackgroundImage = computed(
  () => contentElement.background_image_mobile ?? desktopBackgroundImage.value,
)

const hasBackgroundImage = computed(() =>
  Boolean(desktopBackgroundImage.value || mobileBackgroundImage.value),
)

// A section with a background image participates in the page's LCP priority
// claim (a hero background is often the LCP element). Sections without one opt
// out (index -1) so they don't consume a position from a later image.
const lcpIndex = hasBackgroundImage.value ? useLcpPriority().claim() : -1

const imagePriority = computed(() => resolveImagePriority(lcpIndex, {}))

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

const desktopBackgroundSources = computed(() => {
  if (!desktopBackgroundImage.value) {
    return []
  }
  return createAmplienceSources(
    desktopBackgroundImage.value,
    desktopViewportFraction.value,
  )
})

const mobileBackgroundSources = computed(() => {
  if (!mobileBackgroundImage.value) {
    return []
  }
  return createAmplienceSources(
    mobileBackgroundImage.value,
    mobileViewportFraction.value,
  )
})

const backgroundFallbackSrc = computed(() => {
  const image = mobileBackgroundImage.value ?? desktopBackgroundImage.value
  return image ? buildAmplienceFallbackSrc(image) : undefined
})
</script>
