<template>
  <Head>
    <link
      rel="preconnect"
      :href="`https://${tenantSpace}.cdn.scayle.cloud`"
      crossorigin="anonymous"
    />
    <link
      v-if="shouldPreconnectToCheckout"
      rel="preconnect"
      :href="getCheckoutOrigin(tenantSpace)"
      crossorigin="anonymous"
    />
  </Head>
  <SFAnalyticsHead />
  <div class="flex min-h-dvh flex-col">
    <SFSkipLink search :basket="!isBasketPage" />
    <!-- Toasts sit just below this area and follow its size as the ribbon comes and goes. -->
    <div ref="headerArea">
      <aside
        v-if="promotionRibbonDeal"
        :aria-label="$t('promotion.ribbon.a11y.landmark')"
      >
        <SFDealRibbon
          :class="{ 'max-lg:hidden': isMobileSidebarOpen }"
          :deal="promotionRibbonDeal"
        />
      </aside>
      <SFHeader
        :navigation-items="navigation"
        :promotion-count="promotionCount"
      />
    </div>
    <main
      id="main-content"
      tabindex="-1"
      class="grow border-t border-gray-300"
      data-testid="main-content"
    >
      <slot />
      <div id="teleports" />
    </main>
    <SFLiveAnnouncer />
    <SFFooter
      class="mt-16"
      :navigation-items="footer.footer"
      :bottom-navigation-items="footer.bottomFooter"
    />
    <SFToastContainer :anchor="headerArea" />
    <!--
      Mounted on the first add so the panel's chunk (product cards, slider)
      stays out of SSR and off the initial page load, and stays mounted
      afterwards so its exit transition survives a close.
    -->
    <SFAddToBasketSlideIn v-if="addedItem" />
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/site-navigation
import SFToastContainer from '@client/components/ui/toast/SFToastContainer.vue'
import SFHeader from '@client/components/ui/navigation/header/SFHeader.vue'
import SFFooter from '@client/components/ui/navigation/footer/SFFooter.vue'
import SFDealRibbon from '@client/components/deal/SFDealRibbon.vue'
import { computed, defineAsyncComponent, useTemplateRef } from 'vue'
import { whenever } from '@vueuse/core'
import { Head } from '@inertiajs/vue3'
import { usePage } from '@client/composables/usePage'
import SFAnalyticsHead from '@client/components/SFAnalyticsHead.vue'
import SFSkipLink from '@client/components/ui/core/SFSkipLink.vue'
import { useRouteAnnouncer } from '@client/composables/useRouteAnnouncer'
import { useAddToBasketSlideIn } from '@client/composables/useAddToBasketSlideIn'
import { useMobileSidebar } from '@client/composables/useMobileSidebar'
import { useCountryDetection } from '@client/composables/useCountryDetection'
import { useOverlay } from '@client/composables/useOverlay'
import type {
  NavigationItem,
  Campaign,
  Promotion,
} from '@scayle/storefront/types'
import type { PageComponentName } from '@scayle/storefront'
import { getCheckoutOrigin } from '@scayle/storefront/shared'
import SFLiveAnnouncer from '@client/components/ui/core/SFLiveAnnouncer.vue'

useRouteAnnouncer()

const { promotions, campaign } = defineProps<{
  navigation: NavigationItem[]
  footer: {
    footer: NavigationItem[]
    bottomFooter: NavigationItem[]
  }
  promotions?: Promotion[]
  campaign: Campaign | null
}>()

const page = usePage()

const headerArea = useTemplateRef('headerArea')

// "Skip to basket" is omitted on the basket page — the user is already there.
const isBasketPage = computed(() => page.component === 'Basket')

const tenantSpace = computed(() => page.props.storefront.config.tenantSpace)

// Pages served by this layout that load the checkout web component script, and
// so benefit from a warm connection to its host. `Basket` and `ProductDetail`
// reach it through `SFExpressCheckoutBase`; `SignIn` calls the composable
// directly. `Checkout` also loads it but renders through `SimpleLayout`, which
// carries its own hint. Typed so renaming a page fails the typecheck instead of
// silently dropping the hint. See `useCheckoutWebComponentScript` for why the
// script tag itself carries no `fetchpriority`.
const CHECKOUT_PRECONNECT_PAGES: PageComponentName[] = [
  'Basket',
  'ProductDetail',
  'SignIn',
]

const shouldPreconnectToCheckout = computed(() =>
  CHECKOUT_PRECONNECT_PAGES.some((name) => name === page.component),
)

const promotionRibbonDeal = computed(() =>
  page.component === 'Basket' ? undefined : (campaign ?? promotions?.[0]),
)

const SFAddToBasketSlideIn = defineAsyncComponent(
  () => import('@client/components/basket/SFAddToBasketSlideIn.vue'),
)

// `addedItem` is set by the first add and kept afterwards, so it doubles as the
// "has the panel ever opened" gate the layout needs to bring it into existence.
const { addedItem } = useAddToBasketSlideIn()

const { isOpen: isMobileSidebarOpen } = useMobileSidebar()

const countryDetection = useOverlay().create(
  () => import('@client/components/country-detection/SFCountryDetection.vue'),
)
const { suggestionActive, detectedRegion } = useCountryDetection()
// Asks once per page load. A dismissal is remembered for the tab session by
// `useCountryDetection`, which turns `suggestionActive` off for later loads.
whenever(
  suggestionActive,
  () => {
    if (detectedRegion.value) {
      void countryDetection.open()
    }
  },
  { immediate: true, once: true },
)
// `campaign` is in the SSR HTML while `promotions` is deferred, so counting
// before `promotions` resolves would show the campaign alone, then jump.
const promotionCount = computed(() =>
  promotions ? Number(!!campaign) + promotions.length : 0,
)
</script>
