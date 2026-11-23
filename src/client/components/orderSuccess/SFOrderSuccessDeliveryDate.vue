<template>
  <div class="rounded-lg border border-gray-200 bg-gray-300 font-semibold">
    <div class="rounded-lg bg-white p-2" data-testid="success-delivery-date">
      <SFHint tag="p" class="body-default-secondary">
        {{ $t('order_information.order_details.estimated_delivery_date') }}:
        {{ delivery.deliveryDate.minimum }} –
        {{ delivery.deliveryDate.maximum }}
      </SFHint>
    </div>
    <div
      class="space-x-1 rounded-lg bg-gray-300 p-2"
      data-testid="success-carrier"
    >
      <SFHint
        tag="span"
        :title="$t('order_information.order_details.delivered_by')"
        class="text-secondary"
      >
        {{ $t(`global.carrier_key.${delivery.carrierKey}`) }}
      </SFHint>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OrderDelivery } from '@scayle/storefront/types'
import SFHint from '@client/components/ui/core/SFHint.vue'

defineProps<{
  delivery: OrderDelivery
}>()
</script>
