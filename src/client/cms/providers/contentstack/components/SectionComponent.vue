<template>
  <section
    v-live-preview:content="contentElement"
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
        :src="mobileBackgroundImage"
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
      <ContentstackBlockDispatch
        v-for="(element, index) in nestedBlocks"
        :key="element?.uid"
        :content-element="element"
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
import type { SectionComponent } from '@shared/types/cms/contentstack'
import { createContentstackSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: SectionComponent
}>()

/** Extracts nested content entries from the section. */
const nestedBlocks = computed(() => contentElement.content ?? [])

const paddingClasses = computed(() =>
  resolvePaddingClass(contentElement.padding ?? undefined),
)

/** Resolves minimum height for desktop as a CSS pixel value. */
const minHeightDesktop = computed(() => {
  return `${contentElement.min_height_desktop ?? 0}px`
})

/** Resolves minimum height for mobile, falling back to the desktop value. */
const minHeightMobile = computed(() => {
  const mobile = contentElement.min_height_mobile
  const desktop = contentElement.min_height_desktop ?? 0
  return `${mobile ?? desktop}px`
})

const horizontalContentAlignment = computed(() =>
  resolveFlexAlignmentClass(
    contentElement.horizontal_content_alignment ?? undefined,
  ),
)

/** Reads background color from the Contentstack field, returning undefined when empty. */
const backgroundColor = computed(() => {
  const color = contentElement.background_color
  if (color && color.length > 0) {
    return color
  }
  return undefined
})

const desktopBackgroundImage = computed(
  () => contentElement.background_image_desktop?.url ?? undefined,
)

const mobileBackgroundImage = computed(
  () =>
    contentElement.background_image_mobile?.url ?? desktopBackgroundImage.value,
)

const hasBackgroundImage = computed(() =>
  Boolean(desktopBackgroundImage.value || mobileBackgroundImage.value),
)

// A section with a background image participates in the page's LCP priority
// claim (a hero background is often the LCP element). Sections without one opt
// out (index -1) so they don't consume a position from a later image.
const lcpIndex = hasBackgroundImage.value ? useLcpPriority().claim() : -1

// The CMS `is_priority_image` toggle forces `high` + `eager`; otherwise the
// automatic document-order heuristic in `resolveImagePriority` decides.
const imagePriority = computed(() => {
  const isPriorityImage = contentElement.is_priority_image
  return resolveImagePriority(lcpIndex, {
    fetchPriority: isPriorityImage ? 'high' : undefined,
    loading: isPriorityImage ? 'eager' : undefined,
  })
})

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

/** Generates desktop responsive sources for the section background image. */
const desktopBackgroundSources = computed(() => {
  if (!desktopBackgroundImage.value) {
    return []
  }
  return createContentstackSources(
    desktopBackgroundImage.value,
    desktopViewportFraction.value,
  )
})

/** Generates mobile responsive sources for the section background image. */
const mobileBackgroundSources = computed(() => {
  if (!mobileBackgroundImage.value) {
    return []
  }
  return createContentstackSources(
    mobileBackgroundImage.value,
    mobileViewportFraction.value,
  )
})
</script>
