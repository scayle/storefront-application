<template>
  <SFAccordion
    :id="accordionId"
    v-live-preview:content="contentElement"
    :title="displayTitle"
  >
    <ContentstackBlockDispatch
      v-for="(content, index) in contentElements"
      :key="content?.uid ?? index"
      :content-element="content"
    />
  </SFAccordion>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFAccordion from '@client/components/ui/accordion/SFAccordion.vue'
import type { AccordionItemComponent } from '@shared/types/cms/contentstack'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: AccordionItemComponent
}>()

const displayTitle = computed(
  () => contentElement.display_title || contentElement.title || '',
)
const accordionId = computed(() => contentElement.uid ?? '')

/** Extracts nested accordion item content entries for recursive rendering. */
const contentElements = computed(() => {
  const content = contentElement.content
  return Array.isArray(content) ? content : []
})
</script>
