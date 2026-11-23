<template>
  <SFSlideIn
    v-model:is-open="open"
    :label="$t('shop_selector.flyout_title')"
    data-testid="shop-switcher-slide-in"
  >
    <template #icon>
      <IconUtilityLanguage class="size-6" />
    </template>
    <SFShopSwitcherFlyoutBody
      :available-languages="availableLanguages"
      :available-countries="availableCountries"
      :current-locale="currentLocale"
    />
  </SFSlideIn>
</template>

<script setup lang="ts">
/**
 * Slide-in that lists the shops a user can switch to. Opened through
 * `useShopSwitcherSlideIn()`, which every `SFShopSwitcher` trigger shares.
 */
import IconUtilityLanguage from '@assets/icons/utility/language.svg'
import SFSlideIn from '@client/components/ui/core/SFSlideIn.vue'
import SFShopSwitcherFlyoutBody from '@client/components/shopSwitcher/SFShopSwitcherFlyoutBody.vue'
import { useShopSwitcher } from '@client/composables/useShopSwitcher'

/** Whether the slide-in is open. Bind with `v-model:open`. */
const open = defineModel<boolean>('open', { required: true })

const { availableLanguages, availableCountries, currentLocale } =
  useShopSwitcher()
</script>
