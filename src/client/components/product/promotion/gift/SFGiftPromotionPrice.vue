<template>
  <div class="flex flex-col">
    <SFReductionBadge :promotion="promotion" />
    <span class="disclaimer" data-testid="gift-promotion-originally-row">
      {{ $t('price.originally') }} {{ price.finalPrice }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type {
  VariantPrice,
  ProductPrice,
  Promotion,
  BuyXGetYEffect,
} from '@scayle/storefront/types'
import SFReductionBadge from '../SFReductionBadge.vue'

defineProps<{
  price: VariantPrice | ProductPrice
  promotion: Promotion<BuyXGetYEffect>
}>()
</script>
