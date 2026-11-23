<template>
  <div
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="columnContent"
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
    <ContentfulBlockDispatch
      v-for="(element, index) in columnContent"
      :key="element?.sys?.id ?? index"
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
import type { TypeGridComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: TypeGridComponentWithoutUnresolvableLinksResponse
}>()

const numberOfColumnsDesktop = computed(() =>
  parseColumnCount(contentElement.fields?.numberOfColumnsDesktop, 2),
)
const numberOfColumnsMobile = computed(() =>
  parseColumnCount(contentElement.fields?.numberOfColumnsMobile, 1),
)

const desktopColumnsClass = computed(() =>
  resolveDesktopColumnsClass(numberOfColumnsDesktop.value),
)

const mobileColumnsClass = computed(() =>
  resolveMobileColumnsClass(numberOfColumnsMobile.value),
)

const desktopColumnGap = computed(() =>
  resolveGapClass(contentElement.fields?.gapColumnDesktop, 'column', 'desktop'),
)
const mobileColumnGap = computed(() =>
  resolveGapClass(contentElement.fields?.gapColumnMobile, 'column', 'mobile'),
)
const desktopRowGap = computed(() =>
  resolveGapClass(contentElement.fields?.gapRowDesktop, 'row', 'desktop'),
)
const mobileRowGap = computed(() =>
  resolveGapClass(contentElement.fields?.gapRowMobile, 'row', 'mobile'),
)

const verticalContentAlignment = computed(() =>
  resolveVerticalAlignmentClass(
    contentElement.fields?.verticalContentAlignment,
  ),
)
const horizontalContentAlignment = computed(() =>
  resolveGridAlignmentClass(contentElement.fields?.horizontalContentAlignment),
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

/** Extracts grid column content entries from the Contentful entry. */
const columnContent = computed(() => contentElement.fields?.columnContent ?? [])
</script>
