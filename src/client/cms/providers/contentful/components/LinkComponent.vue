<template>
  <SFLink
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="url"
    :to="url"
    :target="target"
  >
    <ContentfulBlockDispatch
      v-if="childContent"
      :content-element="childContent"
    />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { normalizeCmsLink } from '@client/cms/shared/links'
import type { TypeLinkComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import ContentfulBlockDispatch from './ContentfulBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: TypeLinkComponentWithoutUnresolvableLinksResponse
}>()

const { country } = useStorefrontConfig()

/** Resolves the Contentful link's single content child entry. */
const childContent = computed(() => contentElement.fields?.content)

/**
 * Resolves the Contentful link URL.
 * SFLink handles country localization; `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const url = computed(() => {
  const link = contentElement.fields?.url

  if (!link || typeof link !== 'string') {
    return '/'
  }

  return normalizeCmsLink(link, country.value)
})

/** Ensures links only use supported target values. */
const target = computed(() => {
  return contentElement.fields?.openInNewTab ? '_blank' : '_self'
})
</script>
