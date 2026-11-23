<template>
  <span
    class="text-lg font-semibold text-product-sale"
    :data-testid="`reduction-badge-${promotion.id}`"
  >
    {{ reduction }}
  </span>
</template>

<script setup lang="ts">
import type { Promotion, BuyXGetYEffect } from '@scayle/storefront/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPromotionReductionLabel } from '@shared/utils/promotion'

const { promotion } = defineProps<{ promotion: Promotion<BuyXGetYEffect> }>()

const { t } = useI18n()

/**
 * The promotion's reduction label: the localized "free" label when the effect
 * grants the item for free, otherwise the effect's formatted value (e.g. `-50%`).
 */
const reduction = computed(() => getPromotionReductionLabel(promotion, t))
</script>
