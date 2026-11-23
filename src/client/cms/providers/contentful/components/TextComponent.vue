<template>
  <component
    :is="elementTag"
    v-if="headingLevel"
    :class="HEADING_CLASS_BY_LEVEL[headingLevel]"
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="content"
    class="text-wrap"
  >
    {{ contentElement.fields?.content }}
  </component>
  <p
    v-else
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="content"
    class="body-default text-wrap"
  >
    {{ contentElement.fields?.content }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TypeTextComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import {
  HEADING_CLASS_BY_LEVEL,
  resolveHeadingLevel,
  resolveHeadingTag,
} from '../utils/heading'

const { contentElement } = defineProps<{
  contentElement: TypeTextComponentWithoutUnresolvableLinksResponse
}>()

/** Normalized tag from the Contentful `textType` field. Defaults to `<p>`. */
const elementTag = computed(() =>
  resolveHeadingTag(contentElement.fields?.textType),
)

/** Heading level resolved from the tag, or `undefined` for paragraph text. */
const headingLevel = computed(() => resolveHeadingLevel(elementTag.value))
</script>
