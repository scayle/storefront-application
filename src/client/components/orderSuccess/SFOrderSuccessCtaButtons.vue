<template>
  <div class="flex gap-4">
    <SFButton
      variant="primary"
      :to="routes.home"
      class="flex-1"
      data-testid="success-continue-shopping-button"
    >
      {{ $t('common.continue_shopping') }}
    </SFButton>
    <SFButton
      v-if="!order.customer.isGuestCustomer"
      variant="secondary"
      :to="`${routes.account}/orders/${order.id}`"
      class="flex-1"
      data-testid="success-order-details-button"
    >
      {{ $t('order_success_page.go_to_order_details') }}
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '@scayle/storefront/types'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { routes } from '@shared/routes'

defineProps<{
  order: Order
}>()
</script>
