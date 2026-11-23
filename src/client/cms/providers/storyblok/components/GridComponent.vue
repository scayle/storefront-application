<template>
  <div
    v-editable="contentElement"
    class="grid w-full"
    :class="[
      desktopColumnsClass,
      desktopColumnGap,
      desktopRowGap,
      mobileColumnsClass,
      mobileColumnGap,
      mobileRowGap,
      verticalContentAlignment,
      horizontalContentAlignment,
    ]"
  >
    <StoryblokBlockDispatch
      v-for="element in columnContent"
      :key="element._uid"
      :content-element="element"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  parseColumnCount,
  resolveDesktopColumnsClass,
  resolveGapClass,
  resolveGridAlignmentClass,
  resolveMobileColumnsClass,
  resolveVerticalAlignmentClass,
} from '@client/cms/shared/alignment'
import {
  provideCMSContext,
  useCMSContext,
} from '@client/cms/shared/useCMSContext'
import type { GridComponent as GridComponentType } from '@shared/types/cms/storyblok'
import { extractBlocks } from '../utils/blocks'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: GridComponentType
}>()

const numberOfColumnsDesktop = computed(() =>
  parseColumnCount(contentElement.numberOfColumnsDesktop, 2),
)
const numberOfColumnsMobile = computed(() =>
  parseColumnCount(contentElement.numberOfColumnsMobile, 1),
)

const desktopColumnsClass = computed(() =>
  resolveDesktopColumnsClass(numberOfColumnsDesktop.value),
)

const mobileColumnsClass = computed(() =>
  resolveMobileColumnsClass(numberOfColumnsMobile.value),
)

const desktopColumnGap = computed(() =>
  resolveGapClass(contentElement.gapColumnDesktop, 'column', 'desktop'),
)
const mobileColumnGap = computed(() =>
  resolveGapClass(contentElement.gapColumnMobile, 'column', 'mobile'),
)
const desktopRowGap = computed(() =>
  resolveGapClass(contentElement.gapRowDesktop, 'row', 'desktop'),
)
const mobileRowGap = computed(() =>
  resolveGapClass(contentElement.gapRowMobile, 'row', 'mobile'),
)

const verticalContentAlignment = computed(() =>
  resolveVerticalAlignmentClass(contentElement.verticalContentAlignment),
)
const horizontalContentAlignment = computed(() =>
  resolveGridAlignmentClass(contentElement.horizontalContentAlignment),
)

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()
/**
 * Propagates nested viewport fractions so child media blocks can generate correct responsive sources.
 */
const childDesktopViewportFraction = computed(() => {
  return (1 / numberOfColumnsDesktop.value) * desktopViewportFraction.value
})
const childMobileViewportFraction = computed(() => {
  return (1 / numberOfColumnsMobile.value) * mobileViewportFraction.value
})
provideCMSContext({
  desktopViewportFraction: childDesktopViewportFraction,
  mobileViewportFraction: childMobileViewportFraction,
})

const columnContent = computed(() =>
  extractBlocks(contentElement.columnContent),
)
</script>
