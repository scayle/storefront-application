<template>
  <ul class="flex flex-col gap-1.5 text-lg/4">
    <li
      v-if="campaignReductionSumInCents > 0 && campaign"
      class="flex min-h-7 items-center justify-between gap-1.5 rounded-md px-2 py-1.5"
      :style="campaign.color"
    >
      <span>
        {{ campaign.headline || campaign.name }}
      </span>
      <span class="leading-3" data-testid="basket-discount-campaign">
        {{ campaignReductionSigned }}
      </span>
    </li>
    <li
      v-for="promotion in promotionReductionsSumPerPromotion"
      :key="promotion.id"
      class="flex min-h-7 items-center justify-between gap-1.5 rounded-md px-2 py-1.5"
      data-testid="basket-summary-promotion-item"
      :style="promotion.color"
    >
      <span v-if="promotion.headline">
        {{ promotion.headline }}
      </span>
      <span class="leading-3" data-testid="basket-discount-promotion">
        {{ formatPromotionTotal(promotion) }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { Campaign } from '@scayle/storefront/types'
import type { StorefrontCountry } from '@scayle/storefront/config'
import { formatCurrency } from '@shared/utils/formatter'
import type { PromotionReduction } from '@shared/types/Basket'

const { promotionReductionsSumPerPromotion, campaignReductionSumInCents } =
  defineProps<{
    promotionReductionsSumPerPromotion: PromotionReduction[]
    campaignReductionSumInCents: number
    campaign?: Campaign | null
  }>()

const { props } = usePage()

// Reductions carry positive `*InCents` magnitudes; render them as signed
// (negative) deductions at the call site.
const campaignReductionSigned = computed(() =>
  formatCurrency(
    campaignReductionSumInCents,
    props.storefront.country as StorefrontCountry,
    { signed: true },
  ),
)

const formatPromotionTotal = (promotion: PromotionReduction) =>
  formatCurrency(
    promotion.totalInCents,
    props.storefront.country as StorefrontCountry,
    { signed: true },
  )
</script>
