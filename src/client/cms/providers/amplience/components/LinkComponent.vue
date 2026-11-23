<template>
  <SFLink
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="content"
    :to="url"
    :target="target"
  >
    <AmplienceBlockDispatch
      v-for="(element, index) in contentElements"
      :key="getBlockKey(element, index)"
      :content-element="element"
    />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { normalizeCmsLink } from '@client/cms/shared/links'
import type { LinkComponent as LinkComponentType } from '@shared/types/cms/amplience'
import { extractBlocks, getBlockKey } from '../utils/blocks'
import { generateLink } from '../utils/link'
import AmplienceBlockDispatch from './AmplienceBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: LinkComponentType
}>()

const { country } = useStorefrontConfig()

const contentElements = computed(() => extractBlocks(contentElement.content))

/**
 * Resolves the Amplience link target.
 * SFLink handles country localization; `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const url = computed(() => {
  const link = generateLink(contentElement.link, contentElement.url_type)

  if (!link) {
    return '/'
  }

  return normalizeCmsLink(link, country.value)
})

/** Ensures links only use supported target values in the local link component. */
const target = computed(() => {
  return contentElement.open_in_new_tab ? '_blank' : '_self'
})
</script>
