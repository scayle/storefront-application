<template>
  <SFButton
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="text"
    :variant="variant"
    :to="to"
    :target="target"
  >
    {{ text }}
  </SFButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import type { ButtonVariant } from '@client/utils/constants'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { normalizeCmsLink } from '@client/cms/shared/links'
import type { TypeButtonComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'

const { contentElement } = defineProps<{
  contentElement: TypeButtonComponentWithoutUnresolvableLinksResponse
}>()

const { country } = useStorefrontConfig()

/**
 * Contentful's `style` field values are already storefront button variants,
 * so no remapping is needed. Falls back to `primary` when unset or empty.
 */
const variant = computed<ButtonVariant>(
  () => contentElement.fields?.style || 'primary',
)

/**
 * Resolves the Contentful button URL.
 * SFLink handles country localization. `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const to = computed<string | undefined>(() => {
  const url = contentElement.fields?.url

  if (!url || typeof url !== 'string') {
    return undefined
  }

  return normalizeCmsLink(url, country.value)
})

const text = computed(() => contentElement.fields?.text ?? '')

/** Ensures buttons only use supported target values. */
const target = computed(() => {
  return contentElement.fields?.openInNewTab ? '_blank' : '_self'
})
</script>
