<template>
  <div class="flex w-full flex-3 flex-col space-y-4 lg:space-y-8">
    <h1 class="heading-section-1">
      {{ $t('order_success_page.title') }}
    </h1>

    <SFOrderSuccessGreetingBox class="w-full" />

    <div class="grid w-full text-md">
      <div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <SFOrderSuccessOrderData :order="order" />

        <SFOrderSuccessPaymentData
          v-if="order.payment.length"
          :payment="order.payment"
        />

        <SFOrderSuccessAddressInfo :address="order.address" />
      </div>
    </div>
    <SFOrderSuccessCtaButtons
      :order="order"
      class="mt-4 w-full max-lg:hidden"
    />
  </div>
</template>

<script setup lang="ts">
import type { Order } from '@scayle/storefront/types'
import SFOrderSuccessGreetingBox from './SFOrderSuccessGreetingBox.vue'
import SFOrderSuccessOrderData from './SFOrderSuccessOrderData.vue'
import SFOrderSuccessPaymentData from './SFOrderSuccessPaymentData.vue'
import SFOrderSuccessAddressInfo from './SFOrderSuccessAddressInfo.vue'
import SFOrderSuccessCtaButtons from './SFOrderSuccessCtaButtons.vue'

defineProps<{
  order: Order
}>()
</script>
