<template>
  <SFLink
    :to="buildOrderDetailRoute(id)"
    :disabled="disabled"
    raw
    :data-testid="`order-card-${id}`"
    class="block rounded-xl"
    :class="{ 'pointer-events-none': disabled }"
  >
    <div
      class="group flex items-center justify-between rounded-xl border-2 p-4 shadow-input transition duration-100 ease-linear"
      :class="
        disabled
          ? 'border-disabled bg-white text-disabled'
          : 'border-gray-400 bg-white text-primary hover:bg-gray-100'
      "
    >
      <div class="flex flex-col">
        <div class="mb-3 flex items-center gap-2.5">
          <h3 class="heading-section-3" data-testid="order-card-headline">
            {{ $t('account.orders.card.title', { id }) }}
          </h3>
          <SFAccountOrderStatus
            v-if="status"
            :status="status"
            :disabled="disabled"
          />
        </div>
        <dl v-if="confirmedAt || itemCount" class="contents">
          <div
            v-if="confirmedAt"
            class="mb-1 flex gap-1 text-md text-primary"
            data-testid="order-card-date"
          >
            <dt>
              <span class="font-normal text-secondary"
                >{{ $t('account.orders.card.order_date') }}:</span
              >
            </dt>
            <dd>
              <span class="font-semibold">{{ confirmedAt }}</span>
            </dd>
          </div>
          <div
            v-if="itemCount"
            class="flex gap-1 text-md text-primary"
            data-testid="order-card-items"
          >
            <dt>
              <span class="font-normal text-secondary"
                >{{ $t('account.orders.card.items') }}:</span
              >
            </dt>
            <dd>
              <span class="font-semibold">{{ itemCount }}</span>
            </dd>
          </div>
        </dl>
      </div>
      <span
        data-testid="order-card-detail-button"
        class="flex size-8 shrink-0 items-center justify-center rounded-md transition duration-100 ease-linear"
        :class="
          disabled
            ? 'bg-disabled-background text-disabled'
            : 'bg-gray-200 group-hover:bg-gray-300'
        "
        aria-hidden="true"
      >
        <IconNavigationRight
          class="size-4 fill-gray-500 group-hover:fill-primary"
          :class="{ 'fill-disabled': disabled }"
        />
      </span>
    </div>
  </SFLink>
</template>

<script setup lang="ts">
import SFLink from '@client/components/ui/links/SFLink.vue'
import IconNavigationRight from '@assets/icons/navigation/right.svg'
import type { OrderStatus } from '@scayle/storefront/types'
import { buildOrderDetailRoute } from '@shared/routes'
import SFAccountOrderStatus from './SFAccountOrderStatus.vue'

const {
  id,
  status,
  confirmedAt,
  itemCount,
  disabled = false,
} = defineProps<{
  /** The order ID. */
  id: number
  /** The order status. */
  status?: OrderStatus
  /** The formatted confirmation date. */
  confirmedAt?: string
  /** The number of items in the order. */
  itemCount?: number
  /** Renders the disabled card state (non-navigable). For Storybook until API support exists. */
  disabled?: boolean
}>()
</script>
