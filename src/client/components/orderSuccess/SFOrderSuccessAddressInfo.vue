<template>
  <div class="contents">
    <SFOrderSuccessDetailBox
      :title="
        isSameAddress
          ? $t('order_information.address_details.delivery_and_billing_address')
          : $t('order_information.address_details.delivery_address')
      "
      :class="{ 'col-span-full': isSameAddress }"
      data-testid="success-delivery-address"
    >
      <address class="flex flex-col gap-1 not-italic">
        <p
          v-for="(line, index) in address.shipping.lines"
          :key="`shipping-${index}`"
          class="text-secondary"
        >
          {{ line }}
        </p>
      </address>
    </SFOrderSuccessDetailBox>

    <SFOrderSuccessDetailBox
      v-if="!isSameAddress"
      :title="$t('order_information.address_details.billing_address')"
      data-testid="success-billing-address"
    >
      <address class="flex flex-col gap-1 not-italic">
        <p
          v-for="(line, index) in address.billing.lines"
          :key="`billing-${index}`"
          class="text-secondary"
        >
          {{ line }}
        </p>
      </address>
    </SFOrderSuccessDetailBox>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderAddresses } from '@scayle/storefront/types'
import { addressLinesMatch } from '@client/utils/address'
import SFOrderSuccessDetailBox from './SFOrderSuccessDetailBox.vue'

const { address } = defineProps<{
  address: OrderAddresses
}>()

/**
 * Whether both addresses render the same, in which case one merged box
 * replaces the delivery and billing pair.
 */
const isSameAddress = computed(() =>
  addressLinesMatch(address.shipping, address.billing),
)
</script>
