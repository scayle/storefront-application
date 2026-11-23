<template>
  <PageMetaHead :meta="meta" />
  <!-- The cancellation web component renders no `h1` and only loads in the browser, so the heading comes from here and is in the server HTML. -->
  <h1 class="sr-only">{{ $t('subscription.cancellation.meta.title') }}</h1>
  <ClientOnly>
    <subscription-cancellation
      :base-url="apiBaseUrl"
      :shop-id="config.country.shopCountryId"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/subscriptions
import SimpleLayout from '@client/layout/SimpleLayout.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import { useSubscriptionWebComponentScript } from '@client/composables/useSubscriptionWebComponentScript'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import type { SEOMeta } from '@shared/types/SEO'

useSubscriptionWebComponentScript('cancellation')

// The web component needs the active shop country id. It already reaches the
// client on Inertia shared props, so it is read here rather than duplicated
// onto this page's payload.
const { config } = useStorefrontConfig()

// Explicit name avoids a kebab-case collision with the `<subscription-cancellation>`
// web component element, which would otherwise make the compiler resolve the tag
// to this page component itself.
defineOptions({
  name: 'SubscriptionCancellationPage',
  layout: SimpleLayout,
})

defineProps<{
  apiBaseUrl: string
  meta: SEOMeta
}>()
</script>
