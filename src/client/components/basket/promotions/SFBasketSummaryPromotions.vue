<template>
  <!--
    The figure beside the toggle is the promotion + campaign total only.
    Sale and voucher reductions are rendered in SFBasketSummaryReductions above, not in this total.
  -->
  <div
    data-testid="basket-summary-promotions"
    class="flex flex-col justify-between gap-3"
  >
    <div class="flex items-center justify-between">
      <SFButton
        id="promotion-discounts-header"
        variant="raw"
        class="-my-3.5 flex min-h-11 content-center items-center justify-center gap-1! p-0! text-lg/4 text-primary"
        :aria-expanded="isPromotionsSummaryVisible.toString()"
        aria-controls="promotion-discounts-content"
        data-testid="promotion-summary-toggle-button"
        @click="isPromotionsSummaryVisible = !isPromotionsSummaryVisible"
      >
        {{ $t('basket_summary.discount') }}
        <template #append-icon>
          <IconNavigationUp
            v-if="isPromotionsSummaryVisible"
            class="mt-px size-3.5!"
          />
          <IconNavigationDown v-else class="mt-px size-3.5!" />
        </template>
      </SFButton>
      <span
        v-if="totalReductionInCents > 0"
        class="text-lg/4"
        data-testid="summary-total-promotion-reduction"
      >
        {{ totalReductionSigned }}
      </span>
    </div>
    <SFFadeInTransition>
      <SFBasketSummaryPromotionsDiscounts
        v-if="isPromotionsSummaryVisible"
        id="promotion-discounts-content"
        role="region"
        aria-labelledby="promotion-discounts-header"
        :promotion-reductions-sum-per-promotion="
          basket.cost.promotionReductionsPerPromotion
        "
        :campaign-reduction-sum-in-cents="
          basket.cost.campaignReductionSumInCents
        "
        :campaign="campaign"
      />
    </SFFadeInTransition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { Basket, Campaign } from '@scayle/storefront/types'
import type { StorefrontCountry } from '@scayle/storefront/config'
import { formatCurrency } from '@shared/utils/formatter'
import IconNavigationDown from '@assets/icons/navigation/down.svg'
import IconNavigationUp from '@assets/icons/navigation/up.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFFadeInTransition from '@client/components/ui/transitions/SFFadeInTransition.vue'
import SFBasketSummaryPromotionsDiscounts from './SFBasketSummaryPromotionsDiscounts.vue'

const { basket } = defineProps<{
  basket: Basket
  campaign?: Campaign | null
}>()

const { props } = usePage()

// Promotion + campaign total. Both source fields are positive magnitudes, so
// this gates the row: zero means there is nothing to deduct.
const totalReductionInCents = computed(
  () =>
    basket.cost.promotionReductionSumInCents +
    basket.cost.campaignReductionSumInCents,
)

// Rendered as a signed (negative) deduction, so the sign stays a display concern.
const totalReductionSigned = computed(() =>
  formatCurrency(
    totalReductionInCents.value,
    props.storefront.country as StorefrontCountry,
    { signed: true },
  ),
)

const isPromotionsSummaryVisible = ref(false)
</script>
