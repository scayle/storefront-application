<template>
  <SFLink v-live-preview:url="contentElement" :to="url" :target="target">
    <ContentstackBlockDispatch
      v-for="(child, index) in childContent"
      :key="child?.uid ?? index"
      :content-element="child"
    />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFLink from '@client/components/ui/links/SFLink.vue'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { normalizeCmsLink } from '@client/cms/shared/links'
import type { LinkComponent } from '@shared/types/cms/contentstack'
import ContentstackBlockDispatch from './ContentstackBlockDispatch.vue'

const { contentElement } = defineProps<{
  contentElement: LinkComponent
}>()

const { country } = useStorefrontConfig()

/** Resolves the Contentstack link's content children. */
const childContent = computed(() => contentElement.content ?? [])

/**
 * Resolves the Contentstack link URL.
 * SFLink handles country localization; `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const url = computed(() => {
  const link = contentElement.url

  if (!link || typeof link !== 'string') {
    return '/'
  }

  return normalizeCmsLink(link, country.value)
})

/** Ensures links only use supported target values. */
const target = computed(() => {
  return contentElement.open_in_new_tab ? '_blank' : '_self'
})
</script>
