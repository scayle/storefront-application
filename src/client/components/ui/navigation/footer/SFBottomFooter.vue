<template>
  <div
    class="border-t border-gray-200 bg-gray-100 text-md text-secondary lg:text-primary"
    :class="{ 'max-lg:mb-20': isProductDetailPage }"
  >
    <div
      class="container flex flex-col gap-4 py-5 lg:flex-row lg:gap-8 lg:py-7"
    >
      <div
        class="mr-auto block content-center text-primary"
        data-testid="footer-copyright"
      >
        {{ $t('footer.copyright', { currentYear }) }}
      </div>
      <nav :aria-label="$t('footer.a11y.legal_nav')">
        <ul class="flex flex-row flex-wrap gap-4 text-secondary">
          <li
            v-for="navItem in navigationItems"
            :key="`footer-link-${navItem.id}`"
          >
            <SFNavigationTreeItem
              class="block rounded-md hover:bg-gray-200 lg:p-1"
              data-testid="simple-footer-link"
              raw
              :navigation-item="navItem"
            />
          </li>
          <li>
            <SFButton
              v-if="consentManager.consentManagementRequired"
              variant="raw"
              class="inline w-fit rounded-md text-secondary! hover:bg-gray-200 hover:text-secondary lg:p-1"
              @click="consentPlaceholder"
            >
              {{ $t('footer.privacy_settings') }}
            </SFButton>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMounted } from '@vueuse/core'
import SFButton from '@client/components/ui/core/SFButton.vue'
import type { NavigationItem } from '@scayle/storefront/types'
import { useConsentManager } from '@client/composables/useConsentManager'
import { useIsPage } from '@client/composables/usePageComponent'
import SFNavigationTreeItem from '../SFNavigationTreeItem.vue'

defineProps<{
  navigationItems: NavigationItem[]
}>()
const consentManager = useConsentManager()

// The PDP renders a `fixed` mobile "Add to basket" / scroll-to-top bar
// (`SFProductActions`) that floats over the bottom ~4.75rem of the viewport.
// Reserve matching space below the footer on mobile so the bar settles below
// the legal links instead of covering them at the bottom of the page. Desktop
// hides the bar (`lg:hidden`), so the margin is mobile-only.
const { isActive: isProductDetailPage } = useIsPage('ProductDetail')

// Gated by `useMounted` so SSR and the first client render emit an empty
// year placeholder, then `new Date().getFullYear()` fills in after hydration.
// SSR runs in UTC; CSR runs in the user's local TZ, so evaluating the year
// during render diverges across the Jan 1 UTC boundary and triggers a Vue
// hydration mismatch.
const mounted = useMounted()
const currentYear = computed(() =>
  mounted.value ? String(new Date().getFullYear()) : '',
)
const consentPlaceholder = () => {
  consentManager.openConsentManager()
}
</script>
