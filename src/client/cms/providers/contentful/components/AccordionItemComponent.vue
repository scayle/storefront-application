<template>
  <SFAccordion
    :id="accordionId"
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="content"
    :title="title"
  >
    <ContentfulBlockDispatch
      v-for="(content, index) in contentElements"
      :key="content?.sys?.id ?? index"
      :content-element="content"
    />
  </SFAccordion>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFAccordion from '@client/components/ui/accordion/SFAccordion.vue'
import type { TypeAccordionItemComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: TypeAccordionItemComponentWithoutUnresolvableLinksResponse
}>()

const title = computed(() => contentElement.fields?.title ?? '')
const accordionId = computed(() => contentElement.sys.id)

/** Extracts nested accordion item content entries for recursive rendering. */
const contentElements = computed(() => {
  const content = contentElement.fields?.content
  return Array.isArray(content) ? content : []
})
</script>
