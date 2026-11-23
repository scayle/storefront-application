<template>
  <div data-testid="orders-list">
    <SFClientPagination :items="items" :items-per-page="ORDERS_PER_PAGE">
      <template #default="{ paginatedItems }">
        <SFAccountOrdersEmptyState v-if="paginatedItems.length === 0" />
        <ul v-else>
          <li
            v-for="order in paginatedItems"
            :key="order.id"
            class="mb-6 last-of-type:mb-0"
          >
            <SFAccountOrderCard
              :id="order.id"
              :confirmed-at="order.confirmedAt"
              :status="order.status"
              :item-count="order.itemCount"
            />
          </li>
        </ul>
      </template>
    </SFClientPagination>
  </div>
</template>

<script setup lang="ts">
import type { OrderSummary } from '@scayle/storefront/types'
import SFClientPagination from '@client/components/ui/pagination/SFClientPagination.vue'
import SFAccountOrderCard from './SFAccountOrderCard.vue'
import SFAccountOrdersEmptyState from './SFAccountOrdersEmptyState.vue'

const ORDERS_PER_PAGE = 8

defineProps<{
  /** All order summaries to display with client-side pagination. */
  items: OrderSummary[]
}>()
</script>
