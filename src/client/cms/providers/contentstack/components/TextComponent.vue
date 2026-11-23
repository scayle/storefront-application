<template>
  <component
    :is="elementTag"
    v-if="headingLevel"
    v-live-preview:content="contentElement"
    :class="HEADING_CLASS_BY_LEVEL[headingLevel]"
    class="text-wrap"
  >
    {{ contentElement.content }}
  </component>
  <p
    v-else
    v-live-preview:content="contentElement"
    class="body-default text-wrap"
  >
    {{ contentElement.content }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextComponent } from '@shared/types/cms/contentstack'
import { HeadingLevel, HeadlineTag } from '@client/utils/constants'

const { contentElement } = defineProps<{
  contentElement: TextComponent
}>()

const HEADING_LEVEL_BY_TAG: Partial<Record<HeadlineTag, HeadingLevel>> = {
  [HeadlineTag.H1]: HeadingLevel.PAGE,
  [HeadlineTag.H2]: HeadingLevel.SECTION_1,
  [HeadlineTag.H3]: HeadingLevel.SECTION_2,
  [HeadlineTag.H4]: HeadingLevel.SECTION_3,
}

const isHeadlineTag = (value: string): value is HeadlineTag =>
  Object.values(HeadlineTag).includes(value as HeadlineTag)

/** Normalized tag from the Contentstack `text_type` field. Defaults to `<p>`. */
const elementTag = computed<HeadlineTag>(() => {
  const textType = contentElement.text_type ?? 'p'
  return isHeadlineTag(textType) && textType in HEADING_LEVEL_BY_TAG
    ? (textType as HeadlineTag)
    : HeadlineTag.P
})

/** Heading level resolved from the tag, or `undefined` for paragraph text. */
const headingLevel = computed(() => HEADING_LEVEL_BY_TAG[elementTag.value])

const HEADING_CLASS_BY_LEVEL: Record<HeadingLevel, string> = {
  [HeadingLevel.PAGE]: 'heading-page',
  [HeadingLevel.SECTION_1]: 'heading-section-1',
  [HeadingLevel.SECTION_2]: 'heading-section-2',
  [HeadingLevel.SECTION_3]: 'heading-section-3',
}
</script>
