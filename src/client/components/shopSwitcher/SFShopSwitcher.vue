<template>
  <div
    v-if="hasOtherShops"
    :class="placement === 'sidebar' ? 'max-lg:py-2' : undefined"
    :data-testid="`shop-switcher-${placement}`"
  >
    <SFButton
      ref="button"
      variant="raw"
      aria-haspopup="dialog"
      v-bind="triggerAttrs"
      :aria-label="accessibleName"
      :class="triggerClasses"
      data-testid="language-listbox"
      @click="open()"
    >
      <div
        :class="labelClasses"
        class="flex items-center"
        data-testid="shop-switcher-current-shop"
      >
        <IconUtilityLanguage
          class="mr-1 size-5 lg:size-6"
          data-testid="shop-switcher-globe-icon"
        />
        {{ triggerText }}
      </div>
      <template v-if="placement === 'sidebar'" #append-icon>
        <IconNavigationDown
          class="size-2.5! transition-all"
          data-testid="shop-icon-chevron"
          :class="{ 'rotate-180': isOpen }"
        />
      </template>
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconNavigationDown from '@assets/icons/navigation/down.svg'
import IconUtilityLanguage from '@assets/icons/utility/language.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useShopSwitcher } from '@client/composables/useShopSwitcher'
import { useShopSwitcherSlideIn } from '@client/composables/useShopSwitcherSlideIn'

const { placement = 'header' } = defineProps<{
  /**
   * Where the trigger is rendered. Header uses utility-row styling on desktop.
   * Sidebar uses larger text for the mobile navigation drawer.
   */
  placement?: 'header' | 'sidebar'
}>()

const { isOpen, open, triggerAttrs } = useShopSwitcherSlideIn()

const triggerClasses = computed(() => [
  'flex h-11 lg:h-9.5 items-center gap-1.5 rounded-md p-2 hover:bg-gray-200 -outline-offset-2 aria-busy:animate-pulse aria-busy:cursor-progress motion-reduce:aria-busy:opacity-50',
  { 'text-secondary!': placement === 'sidebar' },
])

const labelClasses = computed(() =>
  placement === 'header' ? 'text-sm' : 'text-lg',
)

const {
  selectedLanguage,
  selectedCountry,
  shopName,
  currentLocale,
  hasOtherShops,
} = useShopSwitcher()

const { t } = useI18n()

// The trigger shows the shop name in the sidebar and only the region in the
// header. The accessible name starts with that same text, so voice control
// users can say what they see, whatever order a translation uses.
const triggerText = computed(() =>
  placement === 'sidebar' ? shopName.value : currentLocale.value.region,
)

const accessibleName = computed(
  () =>
    `${triggerText.value}, ${t('shop_selector.aria_label', {
      selectedCountry: selectedCountry.value,
      selectedLanguage: selectedLanguage.value,
    })}`,
)
</script>
