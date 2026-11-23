<template>
  <Head>
    <link
      v-if="shouldPreconnectToCheckout"
      rel="preconnect"
      :href="getCheckoutOrigin(tenantSpace)"
      crossorigin="anonymous"
    />
  </Head>
  <SFAnalyticsHead />
  <div class="flex min-h-dvh flex-col">
    <SFSkipLink />
    <SFSimpleHeader :shop-name="shopName" :navigation-items="checkoutHeader" />
    <component :is="contentTag" id="main-content" tabindex="-1" class="grow">
      <slot />
    </component>
    <footer>
      <SFBottomFooter :navigation-items="footer.bottomFooter" />
    </footer>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/site-navigation
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import SFBottomFooter from '@client/components/ui/navigation/footer/SFBottomFooter.vue'
import SFSimpleHeader from '@client/components/ui/navigation/header/SFSimpleHeader.vue'
import type { NavigationItem } from '@scayle/storefront/types'
import { getCheckoutOrigin } from '@scayle/storefront/shared'
import SFAnalyticsHead from '@client/components/SFAnalyticsHead.vue'
import SFSkipLink from '@client/components/ui/core/SFSkipLink.vue'

defineProps<{
  shopName?: string
  checkoutHeader: NavigationItem[]
  footer: {
    footer: NavigationItem[]
    bottomFooter: NavigationItem[]
  }
}>()

const page = usePage()

const tenantSpace = computed(() => page.props.storefront.config.tenantSpace)

// `Checkout` loads the checkout web component script, so warm the connection to
// its host before the tag is appended. The other page
// on this layout, `SubscriptionCancellation`, loads a different script and would
// only pay for an unused handshake. See `useCheckoutWebComponentScript` for why
// the script tag itself carries no `fetchpriority`.
const shouldPreconnectToCheckout = computed(() => page.component === 'Checkout')

// The `scayle-checkout` web component renders its own `<main>` landmark. A
// second one around it breaks `landmark-no-duplicate-main`,
// `landmark-main-is-top-level` and `landmark-unique`, so the checkout page gets
// a plain `div` that stays the `#main-content` target of the skip link.
// Every other page keeps the `<main>`.
const contentTag = computed(() =>
  page.component === 'Checkout' ? 'div' : 'main',
)
</script>
