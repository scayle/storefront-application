<template>
  <SFButton
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="label"
    :variant="variant"
    :to="to"
    :target="target"
  >
    {{ text }}
  </SFButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isAbsoluteLink } from '@scayle/storefront/shared'
import SFButton from '@client/components/ui/core/SFButton.vue'
import type { ButtonVariant } from '@client/utils/constants'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { normalizeCmsLink } from '@client/cms/shared/links'
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/amplience'
import { generateLink } from '../utils/link'

const { contentElement } = defineProps<{
  contentElement: ButtonComponentType
}>()

const { country } = useStorefrontConfig()

/**
 * Maps Amplience button styles to storefront button variants.
 * Amplience offers `outline`, which the storefront expresses as `plain`.
 */
const variant = computed<ButtonVariant>(() => {
  switch (contentElement.variant) {
    case 'secondary':
      return 'secondary'
    case 'outline':
      return 'plain'
    case 'accent':
      return 'accent'
    case 'raw':
      return 'raw'
    case 'primary':
    default:
      return 'primary'
  }
})

/**
 * Resolves the Amplience button URL.
 * SFLink handles country localization. `normalizeCmsLink` strips a country
 * prefix the author may have included so the link is not double-localized.
 */
const to = computed<string | undefined>(() => {
  const url = generateLink(contentElement.link)

  if (!url) {
    return undefined
  }

  return normalizeCmsLink(url, country.value)
})

const text = computed(() => contentElement.label ?? '')

/**
 * The Amplience button content type has no explicit new-tab field, so an
 * absolute destination opens in a new tab and an internal path stays in place.
 */
const target = computed(() => {
  return isAbsoluteLink(contentElement.link ?? '') ? '_blank' : '_self'
})
</script>
