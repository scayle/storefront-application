<template>
  <SFLink v-editable="contentElement" :to="url" :target="target">
    <StoryblokBlockDispatch
      v-for="element in contentElements"
      :key="element._uid"
      :content-element="element"
    />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { normalizeCmsLink } from '@client/cms/shared/links'
import type { LinkComponent as LinkComponentType } from '@shared/types/cms/storyblok'
import { extractBlocks } from '../utils/blocks'
import { generateLink } from '../utils/link'
import StoryblokBlockDispatch from './StoryblokBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: LinkComponentType
}>()

const { country } = useStorefrontConfig()
const contentElements = computed(() => extractBlocks(contentElement.content))

/**
 * Resolves the Storyblok link target.
 * SFLink handles country localization; `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const url = computed(() => {
  const link = generateLink(contentElement.url)

  if (!link) {
    return '/'
  }

  return normalizeCmsLink(link, country.value)
})

/** Ensures links only use supported target values in the local link component. */
const target = computed(() => {
  return contentElement.url?.target === '_blank' ? '_blank' : '_self'
})
</script>
