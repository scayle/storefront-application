<template>
  <div
    v-if="progress || text"
    class="flex flex-col px-6 pt-4 text-md text-secondary"
  >
    <SFProgressBar
      v-if="progress !== undefined"
      class="mb-2"
      :progress="progress * 100"
      :aria-label="text"
      :color="promotion.color.backgroundColor"
      :milestones="milestones"
    />
    <div v-if="text" class="mb-4">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import type { TieredPromotion } from '@shared/types/Promotion'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SFProgressBar from '@client/components/deal/SFProgressBar.vue'
import { useMOVPromotions } from '@client/composables/useMOVPromotions'
import { formatCurrency } from '@shared/utils/formatter'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'

const { promotion } = defineProps<{
  promotion: TieredPromotion
}>()

const { t } = useI18n()
const {
  progress,
  tiers,
  remaining,
  isPromotionApplied,
  complete,
  discount,
  milestones,
} = useMOVPromotions(() => promotion)

const { country } = useStorefrontConfig()

const text = computed(() => {
  const hasReachedFirstTier = tiers.value.some((tier) => tier.progress >= 1)

  if (!hasReachedFirstTier) {
    return t('promotion_progress_wrapper.remaining_minimum_order_value', {
      amount: formatCurrency(remaining.value, country.value),
    })
  }

  if (!isPromotionApplied.value) {
    return t('promotion_progress_wrapper.fulfilled_promotion_condition')
  }

  if (complete.value) {
    return t('promotion_progress_wrapper.full_savings', {
      amount: discount.value,
    })
  }

  return t('promotion_progress_wrapper.partial_savings', {
    amount: discount.value,
  })
})
</script>
