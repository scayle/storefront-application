<template>
  <div class="flex flex-col gap-4 border-t border-gray-200 pt-4">
    <dl class="grid grid-cols-2 justify-between gap-2 text-md text-primary">
      <dt class="font-semibold">
        {{ $t('account.order_detail.payment_summary.subtotal') }}
      </dt>
      <dd class="text-right font-semibold" data-testid="order-detail-subtotal">
        {{ cost.subtotal }}
      </dd>

      <dt>{{ $t('account.order_detail.payment_summary.shipping_costs') }}</dt>
      <dd class="text-right" data-testid="order-detail-shipping-cost">
        {{ cost.shippingCost }}
      </dd>

      <template v-if="cost.otherFees">
        <dt>{{ $t('account.order_detail.payment_summary.other_fees') }}</dt>
        <dd class="text-right" data-testid="order-detail-other-fees">
          {{ cost.otherFees }}
        </dd>
      </template>
    </dl>

    <dl class="grid grid-cols-2 justify-between gap-0 text-lg font-semibold">
      <dt class="text-lg">
        {{ $t('account.order_detail.payment_summary.total') }}
      </dt>
      <dd class="text-right text-xl" data-testid="order-detail-total">
        {{ cost.finalPrice }}
      </dd>
      <dt class="text-sm text-secondary">
        {{
          cost.includesTax
            ? $t('global.including_vat')
            : $t('global.excluding_vat')
        }}
      </dt>
      <dd class="sr-only" />
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { OrderCost } from '@scayle/storefront/types'

defineProps<{
  /** The order cost breakdown. */
  cost: OrderCost
}>()
</script>
