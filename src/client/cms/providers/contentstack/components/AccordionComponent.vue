<template>
  <div v-live-preview:content="contentElement">
    <div v-if="displayTitle" class="text-xl font-semibold">
      {{ displayTitle }}
    </div>

    <ContentstackBlockDispatch
      v-for="(content, index) in contentElements"
      :key="content?.uid ?? index"
      :content-element="content"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccordionComponent } from '@shared/types/cms/contentstack'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: AccordionComponent
}>()

const displayTitle = computed(() => contentElement.display_title ?? '')

/** Extracts nested accordion content entries for recursive rendering. */
const contentElements = computed(() => contentElement.content ?? [])
</script>
