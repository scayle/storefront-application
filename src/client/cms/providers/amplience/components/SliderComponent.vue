<template>
  <SFCmsSlider
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    :items="items"
    :get-item-key="getBlockKey"
    :with-arrows="withArrows"
    :with-pagination-indicators="withPaginationIndicators"
  >
    <template #default="{ item }">
      <AmplienceBlockDispatch :content-element="item" />
    </template>
  </SFCmsSlider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFCmsSlider from '@client/cms/shared/SFCmsSlider.vue'
import type { SliderComponent as SliderComponentType } from '@shared/types/cms/amplience'
import { extractBlocks, getBlockKey } from '../utils/blocks'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: SliderComponentType
}>()

const items = computed(() => extractBlocks(contentElement.content))

/** Mirrors V2 defaults when the Amplience slider flags are not set. */
const withArrows = computed(() => contentElement.show_navigation_arrows ?? true)
const withPaginationIndicators = computed(
  () => contentElement.show_pagination_indicators ?? true,
)
</script>
