<template>
  <SFButton
    v-live-preview:text="contentElement"
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
import type { ButtonComponent } from '@shared/types/cms/contentstack'

const { contentElement } = defineProps<{
  contentElement: ButtonComponent
}>()

const { country } = useStorefrontConfig()

/**
 * Contentstack's `style` field values are already storefront button variants,
 * so no remapping is needed. Falls back to `primary` when unset or empty.
 */
const variant = computed<ButtonVariant>(() => contentElement.style || 'primary')

/**
 * Resolves the Contentstack button URL.
 * SFLink handles country localization. `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const to = computed<string | undefined>(() => {
  const url = contentElement.url

  if (!url || typeof url !== 'string') {
    return undefined
  }

  return normalizeCmsLink(url, country.value)
})

const text = computed(() => contentElement.text ?? '')

/** Ensures buttons only use supported target values. */
const target = computed(() => {
  return contentElement.open_in_new_tab ? '_blank' : '_self'
})
</script>
