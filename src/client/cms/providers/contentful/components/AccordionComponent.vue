<template>
  <div
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="content"
  >
    <div v-if="title" class="text-xl font-semibold">
      {{ title }}
    </div>

    <ContentfulBlockDispatch
      v-for="(content, index) in contentElements"
      :key="content?.sys?.id ?? index"
      :content-element="content"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TypeAccordionComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: TypeAccordionComponentWithoutUnresolvableLinksResponse
}>()

const title = computed(() => contentElement.fields?.title ?? '')

/** Extracts nested accordion content entries for recursive rendering. */
const contentElements = computed(() => contentElement.fields?.content ?? [])
</script>
