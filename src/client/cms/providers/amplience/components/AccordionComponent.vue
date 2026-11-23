<template>
  <div
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
  >
    <div v-if="title" class="text-xl font-semibold">
      {{ title }}
    </div>

    <AccordionItemComponent
      v-for="(item, index) in items"
      :key="`${item._meta?.deliveryId ?? ''}:${index}`"
      :content-element="item"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccordionComponent as AccordionComponentType } from '@shared/types/cms/amplience'
import { extractBlocks } from '../utils/blocks'
import AccordionItemComponent from './AccordionItemComponent.vue'

const { contentElement } = defineProps<{
  contentElement: AccordionComponentType
}>()

const title = computed(() => contentElement.title ?? '')

/**
 * Accordion children are bare `AccordionItemComponent` payloads rather than
 * discriminated envelopes, so they are rendered directly instead of through
 * `AmplienceBlockDispatch`.
 */
const items = computed(() => extractBlocks(contentElement.content))
</script>
