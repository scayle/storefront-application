<template>
  <PageMetaHead :meta="meta" />
  <SFAccountLayout>
    <SFAccountOrdersEmptyState v-if="orderSummaries.length === 0" />
    <div v-else>
      <h2
        class="mb-5 flex items-baseline gap-1 heading-section-1 lg:mb-7"
        data-testid="orders-headline"
      >
        {{ $t('account.orders.title') }}
        <SFHeadlineItemCount :count="orderSummaries.length" />
      </h2>
      <SFAccountOrdersList :items="orderSummaries" />
    </div>
  </SFAccountLayout>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/order-history
import SFAccountLayout from '@client/components/account/SFAccountLayout.vue'
import SFAccountOrdersEmptyState from '@client/components/account/orders/SFAccountOrdersEmptyState.vue'
import SFAccountOrdersList from '@client/components/account/orders/SFAccountOrdersList.vue'
import SFHeadlineItemCount from '@client/components/ui/core/SFHeadlineItemCount.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import type { OrderSummary } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'

defineProps<{
  meta: SEOMeta
  orderSummaries: OrderSummary[]
}>()
</script>
