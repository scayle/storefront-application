<template>
  <!--
    Order: (1) Sale and voucher lines from saleAndVoucherReductions.
    (2) Promotions block (SFBasketSummaryPromotions) with its own header total.
    That total is promotion + campaign only, not a sum of every discount on the page.
  -->
  <section class="flex flex-col gap-4 text-lg/4">
    <ul
      v-if="basket.cost.saleAndVoucherReductions.length > 0"
      class="flex flex-col gap-4"
    >
      <template
        v-for="(reduction, index) in basket.cost.saleAndVoucherReductions"
        :key="`${reduction.category}-${index}`"
      >
        <li class="flex justify-between text-product-sale">
          <div>{{ getReductionCategory(reduction) }}</div>
          <span :data-testid="`basket-discount-${reduction.category}`">
            {{ formatReductionAmount(reduction) }}
          </span>
        </li>
      </template>
    </ul>
    <SFBasketSummaryPromotions
      v-if="
        basket.cost.promotionReductionsPerPromotion.length > 0 ||
        basket.cost.campaignReductionSumInCents > 0
      "
      :basket="basket"
      :campaign="campaign"
    />
  </section>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { usePage } from '@client/composables/usePage'
import type {
  AppliedReduction,
  Basket,
  Campaign,
} from '@scayle/storefront/types'
import type { StorefrontCountry } from '@scayle/storefront/config'
import { formatCurrency } from '@shared/utils/formatter'
import SFBasketSummaryPromotions from './SFBasketSummaryPromotions.vue'

const { basket } = defineProps<{
  basket: Basket
  campaign?: Campaign | null
}>()

const { t } = useI18n()
const { props } = usePage()

const getReductionCategory = (reduction: AppliedReduction) => {
  if (reduction.category === 'voucher') {
    return t('basket_summary_reduction.voucher')
  }
  return t('basket_summary_reduction.sale')
}

// The reduction amount is a positive magnitude; render it as a signed (negative)
// deduction. Formatting the sign here keeps `amountInCents` the source of truth.
const formatReductionAmount = (reduction: AppliedReduction) =>
  formatCurrency(
    reduction.amountInCents,
    props.storefront.country as StorefrontCountry,
    { signed: true },
  )
</script>
