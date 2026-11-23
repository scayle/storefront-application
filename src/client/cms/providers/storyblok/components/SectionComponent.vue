<template>
  <section
    v-editable="contentElement"
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
      <StoryblokBlockDispatch
        v-for="(nestedBlock, index) in nestedBlocks"
        :key="nestedBlock._uid"
        :content-element="nestedBlock"
        :class="{
          'mt-auto': shouldAddTopMargin(
            index,
            contentElement.verticalContentAlignment,
          ),
          'mb-auto': shouldAddBottomMargin(
            index,
            nestedBlocks.length,
            contentElement.verticalContentAlignment,
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
import type { SectionComponent as SectionComponentType } from '@shared/types/cms/storyblok'
import { extractBlocks } from '../utils/blocks'
import { createStoryblokSources } from '../utils/media'
import CmsPicture from './CmsPicture.vue'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: SectionComponentType
}>()

const nestedBlocks = computed(() => extractBlocks(contentElement.content))

const paddingClasses = computed(() =>
  resolvePaddingClass(contentElement.padding),
)

const horizontalContentAlignment = computed(() =>
  resolveFlexAlignmentClass(contentElement.horizontalContentAlignment),
)

/**
 * Parses height values from Storyblok fields.
 * Storyblok can return these values as numbers or numeric strings.
 */
const parseHeight = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

const minHeightDesktop = computed(() => {
  const value = parseHeight(contentElement.minHeightDesktop) ?? 0
  return `${value}px`
})

const minHeightMobile = computed(() => {
  const mobile = parseHeight(contentElement.minHeightMobile)
  const desktop = parseHeight(contentElement.minHeightDesktop) ?? 0
  return `${mobile ?? desktop}px`
})

const backgroundColor = computed(() => {
  if (
    contentElement.backgroundColor &&
    contentElement.backgroundColor.length > 0
  ) {
    return contentElement.backgroundColor
  }

  return undefined
})

const desktopBackgroundImage = computed(
  () => contentElement.backgroundImageDesktop?.filename || undefined,
)

const mobileBackgroundImage = computed(
  () =>
    contentElement.backgroundImageMobile?.filename ||
    desktopBackgroundImage.value,
)

const hasBackgroundImage = computed(() =>
  Boolean(desktopBackgroundImage.value || mobileBackgroundImage.value),
)

// A section with a background image participates in the page's LCP priority
// claim (a hero background is often the LCP element). Sections without one opt
// out (index -1) so they don't consume a position from a later image.
const lcpIndex = hasBackgroundImage.value ? useLcpPriority().claim() : -1

// The CMS `isPriorityImage` toggle forces `high` + `eager`; otherwise the
// automatic document-order heuristic in `resolveImagePriority` decides.
const imagePriority = computed(() => {
  const isPriorityImage = contentElement.isPriorityImage
  return resolveImagePriority(lcpIndex, {
    fetchPriority: isPriorityImage ? 'high' : undefined,
    loading: isPriorityImage ? 'eager' : undefined,
  })
})

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

const desktopBackgroundSources = computed(() => {
  if (!desktopBackgroundImage.value) {
    return []
  }
  return createStoryblokSources(
    desktopBackgroundImage.value,
    desktopViewportFraction.value,
  )
})

const mobileBackgroundSources = computed(() => {
  if (!mobileBackgroundImage.value) {
    return []
  }
  return createStoryblokSources(
    mobileBackgroundImage.value,
    mobileViewportFraction.value,
  )
})
</script>
