<template>
  <div
    v-live-preview:content="contentElement"
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
    <ContentstackBlockDispatch
      v-for="(element, index) in columnContent"
      :key="element?.uid ?? index"
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
import type { GridComponent } from '@shared/types/cms/contentstack'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: GridComponent
}>()

const numberOfColumnsDesktop = computed(() =>
  parseColumnCount(contentElement.desktop?.number_of_columns_desktop, 2),
)
const numberOfColumnsMobile = computed(() =>
  parseColumnCount(contentElement.mobile?.number_of_columns_mobile, 1),
)

const desktopColumnsClass = computed(() =>
  resolveDesktopColumnsClass(numberOfColumnsDesktop.value),
)

const mobileColumnsClass = computed(() =>
  resolveMobileColumnsClass(numberOfColumnsMobile.value),
)

const desktopColumnGap = computed(() =>
  resolveGapClass(
    contentElement.desktop?.gap_column_desktop ?? undefined,
    'column',
    'desktop',
  ),
)
const mobileColumnGap = computed(() =>
  resolveGapClass(
    contentElement.mobile?.gap_column_mobile ?? undefined,
    'column',
    'mobile',
  ),
)
const desktopRowGap = computed(() =>
  resolveGapClass(
    contentElement.desktop?.gap_row_desktop ?? undefined,
    'row',
    'desktop',
  ),
)
const mobileRowGap = computed(() =>
  resolveGapClass(
    contentElement.mobile?.gap_row_mobile ?? undefined,
    'row',
    'mobile',
  ),
)

const verticalContentAlignment = computed(() =>
  resolveVerticalAlignmentClass(
    contentElement.vertical_content_alignment ?? undefined,
  ),
)
const horizontalContentAlignment = computed(() =>
  resolveGridAlignmentClass(
    contentElement.horizontal_content_alignmen ?? undefined,
  ),
)

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

/** Propagates nested viewport fractions so child media blocks can generate correct responsive sources. */
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

/** Extracts grid column content entries from the Contentstack entry. */
const columnContent = computed(() => contentElement.content ?? [])
</script>
