<template>
  <SFCmsSlider
    v-live-preview:content="contentElement"
    :items="items"
    :get-item-key="(item, index) => item?.uid ?? index"
    :with-arrows="withArrows"
    :with-pagination-indicators="withPaginationIndicators"
  >
    <template #default="{ item }">
      <ContentstackBlockDispatch :content-element="item" />
    </template>
  </SFCmsSlider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFCmsSlider from '@client/cms/shared/SFCmsSlider.vue'
import type { SliderComponent } from '@shared/types/cms/contentstack'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: SliderComponent
}>()

/** Extracts slider content entries from the Contentstack entry. */
const items = computed(() => contentElement.content ?? [])

/** Mirrors V2 defaults when slider flags are not set. */
const withArrows = computed(() => contentElement.show_navigation_arrows ?? true)
const withPaginationIndicators = computed(
  () => contentElement.show_pagination_indicators ?? true,
)
</script>
