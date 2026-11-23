<template>
  <SFCmsSlider
    v-editable="contentElement"
    :items="items"
    :get-item-key="(item) => item._uid"
    :with-arrows="withArrows"
    :with-pagination-indicators="withPaginationIndicators"
  >
    <template #default="{ item }">
      <StoryblokBlockDispatch :content-element="item" />
    </template>
  </SFCmsSlider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFCmsSlider from '@client/cms/shared/SFCmsSlider.vue'
import type { SliderComponent as SliderComponentType } from '@shared/types/cms/storyblok'
import { extractBlocks } from '../utils/blocks'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: SliderComponentType
}>()

/** Normalizes Storyblok slider items to an array for rendering. */
const items = computed(() => extractBlocks(contentElement.content))

/** Mirrors V2 defaults when Storyblok slider flags are not set. */
const withArrows = computed(() => contentElement.showNavigationArrows ?? true)
const withPaginationIndicators = computed(
  () => contentElement.showPaginationIndicators ?? true,
)
</script>
