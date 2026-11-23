<template>
  <PageMetaHead :meta="meta" />
  <SFAccountLayout>
    <h2
      class="mb-5 heading-section-1 lg:mb-7"
      data-testid="subscriptions-headline"
    >
      {{ $t('subscription.page.headline') }}
    </h2>
    <ClientOnly>
      <subscription-overview
        v-if="accessToken"
        :base-url="apiBaseUrl"
        :customer-token="accessToken"
        :shop-id="config.country.shopCountryId"
      />
    </ClientOnly>
  </SFAccountLayout>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/subscriptions
import SFAccountLayout from '@client/components/account/SFAccountLayout.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import { useSubscriptionWebComponentScript } from '@client/composables/useSubscriptionWebComponentScript'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import type { SEOMeta } from '@shared/types/SEO'

useSubscriptionWebComponentScript('overview')

// The web component needs the active shop country id. It already reaches the
// client on Inertia shared props, so it is read here rather than duplicated
// onto this page's payload.
const { config } = useStorefrontConfig()

defineProps<{
  accessToken?: string
  apiBaseUrl: string
  meta: SEOMeta
}>()
</script>
