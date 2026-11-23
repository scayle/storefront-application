<template>
  <SFLink
    :to="routes.home"
    raw
    :aria-label="
      isOnHome
        ? $t('navigation.a11y.home_link_disabled')
        : $t('navigation.a11y.home_link')
    "
    :aria-disabled="isOnHome || undefined"
    class="w-fit rounded-md"
    @click="onClick"
  >
    <IconLogoSignet class="size-7" />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { localizeLink } from '@scayle/storefront/shared'
import IconLogoSignet from '@assets/icons/logo/signet.svg'
import { routes } from '@shared/routes'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { useRoute } from '@client/composables/useRoute'
import SFLink from '@client/components/ui/links/SFLink.vue'

const { config } = useStorefrontConfig()
const { path } = useRoute()

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const isOnHome = computed(
  () => path.value === localizeLink(config.value, routes.home),
)

const onClick = (event: MouseEvent) => {
  emit('click', event)

  if (!isOnHome.value) {
    // Off home → let SFLink / Inertia navigate normally.
    return
  }

  // On home, honor the announced `aria-disabled` state for keyboard,
  // screen-reader and programmatic activations (`MouseEvent.detail === 0`).
  // For real pointer / touch clicks (`detail >= 1`) we keep the V2
  // scroll-to-top affordance — sighted users get the visual feedback they
  // expect, AT users get a button that announces as disabled and does
  // nothing perceivable, which matches what its label promises.
  if (event.detail === 0) {
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>
