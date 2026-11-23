<template>
  <PageMetaHead :meta="meta" />
  <div id="scayle-checkout-container" class="min-h-[85vh]">
    <!-- The checkout web component starts its own outline at an `h2`, so the page's `h1` comes from here. -->
    <h1 class="sr-only">{{ $t('checkout_page.meta.title') }}</h1>
    <scayle-checkout
      v-if="authApiInitialized && !isReloadingTokens"
      :key="`${accessToken}-${checkoutJwt}`"
      :access-token="accessToken"
      :jwt="checkoutJwt"
      header-element="#header"
      :transaction-id="query.get('transactionId') ?? undefined"
      :consent="JSON.stringify(consent)"
      :tracking-context="JSON.stringify(trackingContext)"
      @consent-missing="openConsentManager"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/checkout
import { useCheckoutWebComponent } from '@client/composables/useCheckoutWebComponent'
import { useCheckoutTracking } from '@client/composables/tracking/useCheckoutTracking'
import { useBasketEvents } from '@client/composables/tracking/useBasketEvents'
import { useTracking } from '@client/composables/tracking/useTracking'
import { useConsent } from '@client/composables/useConsent'
import { useConsentManager } from '@client/composables/useConsentManager'
import SimpleLayout from '@client/layout/SimpleLayout.vue'
import { router } from '@inertiajs/vue3'
import { useCheckoutWebComponentScript } from '@client/composables/useCheckoutWebComponentScript'
import { useRoute } from '@client/composables/useRoute'
import { useBasket } from '@client/composables/useBasket'
import { until, useEventListener, whenever } from '@vueuse/core'
import { createLogger } from '@scayle/storefront/shared'
import type { SEOMeta } from '@shared/types/SEO'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import { computed, onMounted, onScopeDispose, ref } from 'vue'

useCheckoutWebComponentScript()

defineOptions({
  layout: SimpleLayout,
})

interface Props {
  accessToken: string | undefined
  checkoutJwt: string
  meta: SEOMeta
}

const { accessToken, checkoutJwt, meta } = defineProps<Props>()
const { query } = useRoute()
const log = createLogger('checkout')

// The web component sends SCAYLE Analytics events only for the JSON boolean
// `true` in `scayleAnalytics`. Keep that key whenever this object is rewritten,
// or analytics stays off for the rest of the session.
const { consent: paypalConsent } = useConsent('paypal')
const { consent: klarnaConsent } = useConsent('klarna')
const { consent: scayleAnalyticsConsent } = useConsent('scayle-analytics')
const { openConsentManager } = useConsentManager()
const consent = computed(() => ({
  paypal: paypalConsent.value,
  klarna: klarnaConsent.value,
  scayleAnalytics: scayleAnalyticsConsent.value,
}))
const { context: trackingContext } = useTracking()

const { apiInitialized: authApiInitialized, authApi } =
  useCheckoutWebComponent(accessToken)

// The checkout JWT names a basket key, and signing in moves the user's basket
// to a new key while emptying the old one. So between `auth:success` and the
// reload below, the mounted web component still points at the emptied pre-login
// basket and renders it as an empty basket. Keep it unmounted until the JWT for
// the new key arrives; the container reserves the height either way.
const isReloadingTokens = ref(false)

const reloadTokens = () => {
  isReloadingTokens.value = true
  router.reload({
    only: ['accessToken', 'checkoutJwt'],
    // Also fires when another visit cancels this one, so the component cannot
    // stay unmounted.
    onFinish: () => {
      isReloadingTokens.value = false
    },
  })
}
// whenever the user logs in through the checkout web component we need to reload to get the new access token and checkout jwt
whenever(
  authApiInitialized,
  () => {
    // @ts-expect-error the string is correct but because of nominal typing typescript throws an error
    authApi.value?.events.listen('auth:success', reloadTokens)
  },
  {
    once: true,
    // Also run the handler when authApiInitialized is already true when running the setup. This
    // This can happen whenthe express checkout/login was loaded on the previous page.
    immediate: true,
  },
)

onScopeDispose(() => {
  // @ts-expect-error the string is correct but because of nominal typing typescript throws an error
  authApi.value?.events.remove('auth:success', reloadTokens)
})

const handleError = (payload = {}) => {
  log.error({
    message: 'onCheckoutError',
    payload,
  })
}

const { basket, reloadBasket } = useBasket()
const { trackBeginCheckout } = useBasketEvents()

// The basket is a deferred shared prop: after a full page load of the checkout
// it resolves after mount, after a visit from the basket page it is already set.
// It resolves to `null` when the basket fetch fails. The web component loads
// its own basket and still renders, but there is nothing to track.
onMounted(async () => {
  const resolvedBasket = await until(basket).not.toBe(undefined)
  if (resolvedBasket) {
    trackBeginCheckout(resolvedBasket)
  }
})

const { baseUrl } = useRoute()
const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

/**
 * Handles checkout web component events posted via `window.postMessage`.
 *
 * Tracking forwarding is delegated to `forwardCheckoutTrackingMessage`,
 * which validates `event.origin === baseUrl` and accepts only
 * `{ type: 'tracking' }` envelopes with an inner `event` payload. It forwards
 * `add_to_cart` and `remove_from_cart`, and `add_shipping_info` and
 * `add_payment_info` once per checkout page visit with items and value
 * from the basket passed here, and drops every other event.
 *
 * On top of the dataLayer forwarding, the cart events trigger
 * `reloadBasket()` so `useBasket` stays in sync with the basket mutations
 * made inside the web component.
 */
const onCheckoutUpdate = async (event: MessageEvent<unknown>) => {
  const result = forwardCheckoutTrackingMessage(
    event,
    baseUrl.value,
    basket.value,
  )

  if (
    result.forwarded &&
    (result.eventName === 'add_to_cart' ||
      result.eventName === 'remove_from_cart')
  ) {
    await reloadBasket()
  }
}
useEventListener('message', (event) => onCheckoutUpdate(event))
</script>
