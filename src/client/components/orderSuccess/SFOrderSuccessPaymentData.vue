<template>
  <SFOrderSuccessDetailBox
    v-if="paymentKey"
    :title="$t('order_information.payment_details.title')"
    data-testid="success-payment-data"
  >
    <ul class="flex flex-col gap-1">
      <li>
        <SFLabelValue
          :label="$t('order_information.payment_details.payment_method')"
          :value="$t(`global.payment_key.${paymentKey}`)"
        />
      </li>
    </ul>
  </SFOrderSuccessDetailBox>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderPayment } from '@scayle/storefront/types'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'
import SFOrderSuccessDetailBox from './SFOrderSuccessDetailBox.vue'

const { payment } = defineProps<{
  payment: OrderPayment[]
}>()

const paymentKey = computed(() => payment[0]?.key)
</script>
