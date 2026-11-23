<template>
  <component
    :is="elementTag"
    v-if="headingLevel"
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    :class="HEADING_CLASS_BY_LEVEL[headingLevel]"
    class="text-wrap"
  >
    {{ contentElement.content }}
  </component>
  <p
    v-else
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    class="body-default text-wrap"
  >
    {{ contentElement.content }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextComponent as TextComponentType } from '@shared/types/cms/amplience'
import {
  HEADING_CLASS_BY_LEVEL,
  resolveHeadingLevel,
  resolveHeadingTag,
} from '../utils/heading'

const { contentElement } = defineProps<{
  contentElement: TextComponentType
}>()

/** Normalized tag from the Amplience `textType` field. Defaults to `<p>`. */
const elementTag = computed(() => resolveHeadingTag(contentElement.textType))

/** Heading level resolved from the tag, or `undefined` for paragraph text. */
const headingLevel = computed(() => resolveHeadingLevel(elementTag.value))
</script>
