<template>
  <div v-bind="$attrs" class="flex flex-col text-primary">
    <span
      v-if="brand"
      class="text-md font-semibold"
      data-testid="order-detail-product-brand"
    >
      {{ brand }}
    </span>
    <span class="text-sm" data-testid="order-detail-product-name">
      {{ name }}
    </span>
  </div>
  <ul class="flex flex-col gap-1 text-sm text-secondary">
    <li v-if="color" class="flex gap-1">
      <SFLabelValue
        :label="$t('account.order_detail.product.color')"
        :value="color"
        data-testid="order-detail-product-color"
      />
    </li>
    <li class="flex gap-1">
      <SFLabelValue
        :label="$t('account.order_detail.product.size')"
        :value="size"
        data-testid="order-detail-product-size"
      />
    </li>
    <li class="flex gap-1">
      <SFLabelValue
        :label="$t('global.quantity')"
        :value="quantity.toString()"
        data-testid="order-detail-product-quantity"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'

/**
 * Multi-root template (the name `div` plus the attributes `ul`). Fallthrough
 * attributes are bound to the leading `div`, the component's primary block.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  /** The product name. */
  name: string
  /** The item quantity. */
  quantity: number
  /** The variant size label. */
  size: string
  /** The product brand. */
  brand?: string
  /** The product color. */
  color?: string
}>()
</script>
