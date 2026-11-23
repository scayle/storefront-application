<template>
  <div
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
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
    <AmplienceBlockDispatch
      v-for="(element, index) in columnContent"
      :key="getBlockKey(element, index)"
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
import type { GridComponent as GridComponentType } from '@shared/types/cms/amplience'
import { extractBlocks, getBlockKey } from '../utils/blocks'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: GridComponentType
}>()

const columnsDesktop = computed(() =>
  parseColumnCount(contentElement.columns_desktop, 2),
)
const columnsMobile = computed(() =>
  parseColumnCount(contentElement.columns_mobile, 1),
)

const desktopColumnsClass = computed(() =>
  resolveDesktopColumnsClass(columnsDesktop.value),
)

const mobileColumnsClass = computed(() =>
  resolveMobileColumnsClass(columnsMobile.value),
)

const desktopColumnGap = computed(() =>
  resolveGapClass(contentElement.gap_column_desktop, 'column', 'desktop'),
)
const mobileColumnGap = computed(() =>
  resolveGapClass(contentElement.gap_column_mobile, 'column', 'mobile'),
)
const desktopRowGap = computed(() =>
  resolveGapClass(contentElement.gap_row_desktop, 'row', 'desktop'),
)
const mobileRowGap = computed(() =>
  resolveGapClass(contentElement.gap_row_mobile, 'row', 'mobile'),
)

const verticalContentAlignment = computed(() =>
  resolveVerticalAlignmentClass(contentElement.vertical_content_alignment),
)
const horizontalContentAlignment = computed(() =>
  resolveGridAlignmentClass(contentElement.horizontal_content_alignment),
)

const { desktopViewportFraction, mobileViewportFraction } = useCMSContext()

/**
 * Propagates nested viewport fractions so child media blocks generate correct
 * responsive sources for the narrower space a grid cell gives them.
 */
const childDesktopViewportFraction = computed(
  () => (1 / columnsDesktop.value) * desktopViewportFraction.value,
)
const childMobileViewportFraction = computed(
  () => (1 / columnsMobile.value) * mobileViewportFraction.value,
)
provideCMSContext({
  desktopViewportFraction: childDesktopViewportFraction,
  mobileViewportFraction: childMobileViewportFraction,
})

const columnContent = computed(() => extractBlocks(contentElement.content))
</script>
