<template>
  <div class="flex flex-col gap-2.5">
    <div
      v-for="delivery in order.deliveries"
      :key="delivery.id"
      class="mt-3 grid grid-cols-1"
    >
      <ul
        v-if="delivery.items.length"
        class="flex flex-col gap-3 divide-y divide-gray-200 *:pb-3"
      >
        <li v-for="item in delivery.items" :key="item.id">
          <SFOrderDetailProductCard :order-item="item" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '@scayle/storefront/types'
import SFOrderDetailProductCard from './SFOrderDetailProductCard.vue'

defineProps<{
  /** The full order object containing deliveries. */
  order: Order
}>()
</script>
