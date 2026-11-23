<template>
  <PageMetaHead :meta="meta" />
  <div class="container flex flex-col py-8">
    <template v-if="order">
      <div
        class="relative flex flex-col gap-6 lg:flex-row lg:items-stretch"
        data-testid="order-success-container"
      >
        <SFOrderSuccessBasicDataSection :order="order" />
        <SFOrderSuccessSummarySection :order="order" />
      </div>
      <SFOrderSuccessCtaButtons class="mt-6 lg:hidden" :order="order" />
    </template>
    <SFOrderSuccessEmptyState v-else />
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/checkout/order-confirmation
import type { Order } from '@scayle/storefront/types'
import SFOrderSuccessBasicDataSection from '@client/components/orderSuccess/SFOrderSuccessBasicDataSection.vue'
import SFOrderSuccessSummarySection from '@client/components/orderSuccess/SFOrderSuccessSummarySection.vue'
import SFOrderSuccessCtaButtons from '@client/components/orderSuccess/SFOrderSuccessCtaButtons.vue'
import SFOrderSuccessEmptyState from '@client/components/orderSuccess/SFOrderSuccessEmptyState.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import type { SEOMeta } from '@shared/types/SEO'
import { useOrderEvents } from '@client/composables/tracking/useOrderEvents'
import { onMounted } from 'vue'

const { order } = defineProps<{
  order?: Order
  meta: SEOMeta
}>()

const { trackPurchase } = useOrderEvents()

onMounted(() => {
  if (order) {
    void trackPurchase(order)
  }
})
</script>
