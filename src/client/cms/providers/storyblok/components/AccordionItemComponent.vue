<template>
  <SFAccordion :id="accordionId" v-editable="contentElement" :title="title">
    <StoryblokBlockDispatch
      v-for="content in contentElements"
      :key="content._uid"
      :content-element="content"
    />
  </SFAccordion>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFAccordion from '@client/components/ui/accordion/SFAccordion.vue'
import type { AccordionItemComponent as AccordionItemComponentType } from '@shared/types/cms/storyblok'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: AccordionItemComponentType
}>()

const title = computed(() => contentElement.title ?? '')
const accordionId = computed(() => contentElement._uid)
/** Normalizes nested accordion item content to a safe array for recursive rendering. */
const contentElements = computed(() => {
  return Array.isArray(contentElement.content) ? contentElement.content : []
})
</script>
