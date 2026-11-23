<template>
  <aside
    class="relative flex flex-2 flex-col rounded-xl bg-gray-100 leading-4 max-lg:overflow-hidden lg:mt-6 lg:w-2/5 lg:px-5 lg:py-8"
    data-testid="order-success-summary"
  >
    <section class="sticky top-8 z-10 flex w-full flex-col gap-4 text-md/4">
      <div class="w-full px-5 py-8 text-sm lg:p-0">
        <h2 class="mb-4 heading-section-1">
          {{
            $t('order_information.order_details.order_number_value', {
              orderNumber: order.id,
            })
          }}
        </h2>

        <div v-for="delivery in order.deliveries" :key="delivery.id">
          <SFOrderSuccessDeliveryDate :delivery="delivery" />

          <ul
            v-if="delivery.items.length"
            class="mb-3 flex flex-col gap-3 divide-y divide-gray-200 *:py-3"
          >
            <li v-for="item in delivery.items" :key="item.id" class="pt-3">
              <SFOrderSuccessProductCard :item="item" />
            </li>
          </ul>
        </div>

        <SFOrderSuccessPaymentSummary :cost="order.cost" />
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { Order } from '@scayle/storefront/types'
import SFOrderSuccessDeliveryDate from './SFOrderSuccessDeliveryDate.vue'
import SFOrderSuccessProductCard from './SFOrderSuccessProductCard.vue'
import SFOrderSuccessPaymentSummary from './SFOrderSuccessPaymentSummary.vue'

defineProps<{
  order: Order
}>()
</script>
