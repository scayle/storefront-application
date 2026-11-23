<template>
  <SFOrderSuccessDetailBox
    :title="$t('order_information.order_details.title')"
    data-testid="success-order-data"
  >
    <ul class="flex flex-col gap-1">
      <li v-if="order.confirmedAt">
        <SFLabelValue
          :label="$t('order_information.order_details.order_date')"
          :value="order.confirmedAt"
        />
      </li>
      <li v-if="order.id">
        <SFLabelValue
          :label="$t('order_information.order_details.order_number')"
          :value="String(order.id)"
        />
      </li>
      <li v-if="order.customer">
        <SFLabelValue
          :label="$t('order_information.order_details.customer_id')"
          :value="String(order.customer.id)"
        />
      </li>
    </ul>
  </SFOrderSuccessDetailBox>
</template>

<script setup lang="ts">
import type { Order } from '@scayle/storefront/types'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'
import SFOrderSuccessDetailBox from './SFOrderSuccessDetailBox.vue'

defineProps<{
  order: Order
}>()
</script>
