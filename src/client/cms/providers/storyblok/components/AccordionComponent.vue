<template>
  <div v-editable="contentElement">
    <div v-if="title" class="text-xl font-semibold">
      {{ title }}
    </div>

    <StoryblokBlockDispatch
      v-for="content in contentElements"
      :key="content._uid"
      :content-element="content"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccordionComponent as AccordionComponentType } from '@shared/types/cms/storyblok'
import { extractBlocks } from '../utils/blocks'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: AccordionComponentType
}>()

const title = computed(() => contentElement.title ?? '')
/** Normalizes nested accordion content to a safe array for recursive rendering. */
const contentElements = computed(() => extractBlocks(contentElement.content))
</script>
