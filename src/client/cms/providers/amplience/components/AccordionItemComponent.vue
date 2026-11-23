<template>
  <SFAccordion
    :id="accordionId"
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    :title="title"
  >
    <AmplienceBlockDispatch
      v-for="(element, index) in contentElements"
      :key="getBlockKey(element, index)"
      :content-element="element"
    />
  </SFAccordion>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import SFAccordion from '@client/components/ui/accordion/SFAccordion.vue'
import type { AccordionItemComponent as AccordionItemComponentType } from '@shared/types/cms/amplience'
import { extractBlocks, getBlockKey } from '../utils/blocks'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: AccordionItemComponentType
}>()

/**
 * Amplience has no per-block id, and nested items share their parent content
 * item's `deliveryId`, so neither can key the accordion's `aria-controls`
 * wiring. `useId` produces a unique value that matches across SSR and hydration.
 */
const accordionId = useId()

const title = computed(() => contentElement.title ?? '')
const contentElements = computed(() => extractBlocks(contentElement.content))
</script>
