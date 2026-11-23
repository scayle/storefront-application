<template>
  <PageMetaHead :meta="meta" />
  <div
    class="m-auto flex max-w-112 flex-col items-start justify-center pt-6 *:w-full max-lg:px-4 lg:pt-10"
  >
    <div class="mb-5 flex items-center justify-between lg:mb-7">
      <h1 class="heading-section-1 leading-6! max-lg:text-xl!">
        {{ $t('sign_in_page.title') }}
      </h1>
    </div>
    <!-- Include empty content to ensure formatters don't incorrectly remove the closing tag from a web component -->
    <scayle-auth-new-password
      v-if="authApiInitialized && resetHash"
      :hash="resetHash"
    >
      &nbsp;
    </scayle-auth-new-password>
    <scayle-auth
      v-else-if="authApiInitialized"
      :variant="showRegistration ? 'register' : 'login'"
      :pw-reset-url="passwordResetUrl"
      :tracking-context="JSON.stringify(trackingContext)"
    >
      &nbsp;
    </scayle-auth>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/login-and-registration
import { useCheckoutTracking } from '@client/composables/tracking/useCheckoutTracking'
import { useTracking } from '@client/composables/tracking/useTracking'
import { useCheckoutWebComponent } from '@client/composables/useCheckoutWebComponent'
import { useCheckoutWebComponentScript } from '@client/composables/useCheckoutWebComponentScript'
import { useRoute } from '@client/composables/useRoute'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import type { SEOMeta } from '@shared/types/SEO'
import { routes } from '@shared/routes'
import { localizeLink } from '@scayle/storefront/shared'
import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'

useCheckoutWebComponentScript()

const { accessToken } = defineProps<{
  showRegistration?: boolean
  accessToken?: string
  meta: SEOMeta
}>()

const { apiInitialized: authApiInitialized } =
  useCheckoutWebComponent(accessToken)

const { query, baseUrl } = useRoute()
const { context: trackingContext } = useTracking()
const { forwardCheckoutTrackingMessage } = useCheckoutTracking()

// The password reset e-mail links to `/signin?hash=<hash>`, never to a URL
// fragment. `<scayle-auth-new-password>` reads that query parameter itself.
const resetHash = computed(() => query.value.get('hash') ?? undefined)

const { config: storefront } = useStorefrontConfig()

// Without `pw-reset-url` the auth SDK builds the reset link from
// `window.location`, so the current query string ends up in the e-mail. The
// Authentication API substitutes `{hash}` and rejects any host that is not
// the shop domain configured in the Panel.
//
// Built by concatenation rather than `buildRoute`: that helper URL-encodes
// query values, which would percent-encode the literal `{hash}` placeholder
// and break the Authentication API's substitution.
const passwordResetUrl = computed(
  () =>
    `${baseUrl.value}${localizeLink(storefront.value, routes.signin)}?hash={hash}`,
)

/**
 * Forwards tracking events posted by the SCAYLE auth web component
 * (`<scayle-auth>` / `<scayle-auth-new-password>`) onto the shop's
 * `dataLayer`.
 *
 * The bridge in `forwardCheckoutTrackingMessage` forwards only the basket
 * changes and checkout steps the checkout web component posts, so it drops
 * every event the auth web components post today. `useCheckoutWebComponent`
 * tracks `login` and `sign_up` until the auth web components send them; then
 * both join the bridge's forwarded events and that tracking call goes.
 *
 * The auth web components post no checkout steps, so the bridge gets no
 * basket here.
 */
useEventListener('message', (event: MessageEvent<unknown>) => {
  forwardCheckoutTrackingMessage(event, baseUrl.value, undefined)
})
</script>
