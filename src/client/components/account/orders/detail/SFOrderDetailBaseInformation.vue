<template>
  <div class="grid grid-cols-1 gap-4 body-default-secondary lg:grid-cols-2">
    <SFOrderSuccessDetailBox
      :title="$t('account.order_detail.order_details.title')"
    >
      <SFLabelValue
        v-if="order.confirmedAt"
        :label="$t('account.order_detail.order_details.order_date')"
        :value="order.confirmedAt"
        :size="TextSize.LARGE"
      />
    </SFOrderSuccessDetailBox>
    <SFOrderSuccessDetailBox
      :title="$t('account.order_detail.payment_details.title')"
    >
      <SFLabelValue
        :label="$t('account.order_detail.payment_details.payment_method')"
        :value="$t(`global.payment_key.${paymentKey}`)"
        :size="TextSize.LARGE"
      />
    </SFOrderSuccessDetailBox>
    <SFOrderDetailAddressBox
      :title="shippingAddressTitle"
      :address="order.address.shipping"
      :class="{ 'col-span-full': isSameAddress }"
    />
    <SFOrderDetailAddressBox
      v-if="!isSameAddress"
      :title="$t('account.order_detail.address_details.billing_address')"
      :address="order.address.billing"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Order } from '@scayle/storefront/types'
import { TextSize } from '@client/utils/constants'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'
import SFOrderSuccessDetailBox from '@client/components/orderSuccess/SFOrderSuccessDetailBox.vue'
import { addressLinesMatch } from '@client/utils/address'
import SFOrderDetailAddressBox from './SFOrderDetailAddressBox.vue'

const { t } = useI18n()

const { order } = defineProps<{
  /** The full order object. */
  order: Order
}>()

const paymentKey = computed(() => order.payment?.[0]?.key ?? 'default')

/**
 * Whether both addresses render the same, in which case one merged box
 * replaces the delivery and billing pair.
 */
const isSameAddress = computed(() =>
  addressLinesMatch(order.address.shipping, order.address.billing),
)

const shippingAddressTitle = computed(() =>
  isSameAddress.value
    ? t('account.order_detail.address_details.delivery_and_billing_address')
    : t('account.order_detail.address_details.delivery_address'),
)
</script>
