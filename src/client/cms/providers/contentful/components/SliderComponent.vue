<template>
  <SFCmsSlider
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="content"
    :items="items"
    :get-item-key="(item, index) => item?.sys?.id ?? index"
    :with-arrows="withArrows"
    :with-pagination-indicators="withPaginationIndicators"
  >
    <template #default="{ item }">
      <ContentfulBlockDispatch :content-element="item" />
    </template>
  </SFCmsSlider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFCmsSlider from '@client/cms/shared/SFCmsSlider.vue'
import type { TypeSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: TypeSliderComponentWithoutUnresolvableLinksResponse
}>()

/** Extracts slider content entries from the Contentful entry. */
const items = computed(() => contentElement.fields?.content ?? [])

/** Mirrors V2 defaults when slider flags are not set. */
const withArrows = computed(
  () => contentElement.fields?.showNavigationArrows ?? true,
)
const withPaginationIndicators = computed(
  () => contentElement.fields?.showPaginationIndicators ?? true,
)
</script>
