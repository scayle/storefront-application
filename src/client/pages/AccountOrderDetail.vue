<template>
  <PageMetaHead :meta="meta" />
  <SFAccountLayout>
    <SFOrderDetailHeadline
      :id="order.id"
      :status="order.status"
      class="mb-5 lg:mb-7"
    />
    <SFOrderDetailBaseInformation :order="order" class="mb-4" />
    <SFOrderDetailSubscriptionNotice v-if="hasSubscriptionItems" class="mb-4" />
    <SFOrderDetailProductList :order="order" />
    <SFOrderDetailPaymentSummary :cost="order.cost" />
  </SFAccountLayout>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/account-and-orders/order-details
import SFAccountLayout from '@client/components/account/SFAccountLayout.vue'
import SFOrderDetailHeadline from '@client/components/account/orders/detail/SFOrderDetailHeadline.vue'
import SFOrderDetailBaseInformation from '@client/components/account/orders/detail/SFOrderDetailBaseInformation.vue'
import SFOrderDetailProductList from '@client/components/account/orders/detail/SFOrderDetailProductList.vue'
import SFOrderDetailPaymentSummary from '@client/components/account/orders/detail/SFOrderDetailPaymentSummary.vue'
import SFOrderDetailSubscriptionNotice from '@client/components/account/orders/detail/SFOrderDetailSubscriptionNotice.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import type { Order } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import { computed } from 'vue'

const { order } = defineProps<{
  order: Order
  meta: SEOMeta
}>()

/** True when any item in the order was bought as a subscription. */
const hasSubscriptionItems = computed(() =>
  order.deliveries.some((delivery) =>
    delivery.items.some((item) => item.subscriptionDefinition),
  ),
)
</script>
