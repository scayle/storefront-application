<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <SFBackButton
        :to="routes.accountOrders"
        data-testid="back-to-order-list"
      />
      <h2 class="heading-section-1" data-testid="order-detail-headline">
        {{ $t('account.order_detail.title', { id }) }}
      </h2>
    </div>
    <SFAccountOrderStatus :status="status" />
  </div>
</template>

<script setup lang="ts">
import SFBackButton from '@client/components/ui/navigation/SFBackButton.vue'
import SFAccountOrderStatus from '@client/components/account/orders/SFAccountOrderStatus.vue'
import type { OrderStatus } from '@scayle/storefront/types'
import { routes } from '@shared/routes'

defineProps<{
  /** The order ID. */
  id: number
  /** The order status. */
  status: OrderStatus
}>()
</script>
