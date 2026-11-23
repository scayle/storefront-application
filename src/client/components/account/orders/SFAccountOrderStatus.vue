<template>
  <div
    class="flex h-5 items-center gap-1.5 rounded-sm px-1.5 text-sm font-semibold"
    data-testid="order-status"
    :class="[
      statusConfig.lightColor,
      disabled ? 'text-disabled' : 'text-primary',
    ]"
  >
    <div
      aria-hidden="true"
      class="size-2 shrink-0 rounded-sm"
      :class="statusConfig.dotColor"
    />
    {{ statusConfig.label }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OrderStatus } from '@scayle/storefront/types'

const { status, disabled = false } = defineProps<{
  /** The order status to display. */
  status: OrderStatus
  /** Mutes badge text when the parent order card is disabled. */
  disabled?: boolean
}>()

const { t } = useI18n()

const statusConfig = computed(() => {
  const map: Record<
    OrderStatus,
    { label: string; dotColor: string; lightColor: string }
  > = {
    order_open: {
      label: t('account.orders.status.open'),
      dotColor: 'bg-status-warning',
      lightColor: 'bg-status-warning-light',
    },
    payment_pending: {
      label: t('account.orders.status.open'),
      dotColor: 'bg-status-warning',
      lightColor: 'bg-status-warning-light',
    },
    payment_reserved: {
      label: t('account.orders.status.confirmed'),
      dotColor: 'bg-accent',
      lightColor: 'bg-status-info/50',
    },
    invoice_completed: {
      label: t('account.orders.status.shipped'),
      dotColor: 'bg-status-success',
      lightColor: 'bg-status-success-light',
    },
    invoice_partially_completed: {
      label: t('account.orders.status.confirmed'),
      dotColor: 'bg-accent',
      lightColor: 'bg-status-info/50',
    },
    cancellation_completed: {
      label: t('account.orders.status.cancelled'),
      dotColor: 'bg-status-alert',
      lightColor: 'bg-status-alert-light',
    },
    cancellation_pending: {
      label: t('account.orders.status.cancelled'),
      dotColor: 'bg-status-alert',
      lightColor: 'bg-status-alert-light',
    },
  }

  return (
    map[status] ?? {
      label: status,
      dotColor: 'bg-gray-400',
      lightColor: 'bg-gray-100',
    }
  )
})
</script>
