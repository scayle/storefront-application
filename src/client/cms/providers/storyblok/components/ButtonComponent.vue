<template>
  <SFButton
    v-editable="contentElement"
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
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/storyblok'
import { generateLink } from '../utils/link'

const { contentElement } = defineProps<{
  contentElement: ButtonComponentType
}>()

const { country } = useStorefrontConfig()

/**
 * Storyblok's `style` field values are already storefront button variants, so
 * no remapping is needed. Falls back to `primary` when unset or the empty
 * string Storyblok sends for an unselected dropdown option.
 */
const variant = computed<ButtonVariant>(() => contentElement.style || 'primary')

/**
 * Resolves the Storyblok button URL.
 * SFLink handles country localization. `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const to = computed<string | undefined>(() => {
  const url = generateLink(contentElement.url)

  if (!url) {
    return undefined
  }

  return normalizeCmsLink(url, country.value)
})

const text = computed(() => contentElement.text ?? '')

/** Ensures buttons only use the supported target values in the local link component. */
const target = computed(() => {
  return contentElement.url?.target === '_blank' ? '_blank' : '_self'
})
</script>
