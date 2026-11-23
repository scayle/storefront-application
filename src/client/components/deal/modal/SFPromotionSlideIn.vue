<template>
  <SFSlideIn
    v-model:is-open="open"
    :label="$t('promotion_slide_in.headline')"
    size="md"
    data-testid="promotion-slide-in"
  >
    <div class="px-6 pb-6">
      <p class="mb-8 body-default-secondary">
        {{ $t('promotion_slide_in.subline') }}
      </p>

      <div v-if="!promotions?.length && !campaign">
        {{ $t('promotion_slide_in.no_active_subline') }}
      </div>
      <ul v-else class="flex flex-col gap-6">
        <li v-if="campaign" data-testid="campaign-card">
          <SFDealBanner
            :deal="campaign"
            show-condition
            :show-text-box="false"
            :placement="
              getDealPlacement(
                'deals_overview_banner',
                promotions,
                true,
                'campaign',
              )
            "
          />
        </li>
        <li
          v-for="(promotion, index) in promotions"
          :key="promotion.id"
          data-testid="promotion-card"
        >
          <SFDealBanner
            :deal="promotion"
            show-condition
            :placement="
              getDealPlacement(
                'deals_overview_banner',
                promotions,
                Boolean(campaign),
                index,
              )
            "
          />
        </li>
      </ul>
    </div>
  </SFSlideIn>
</template>

<script setup lang="ts">
import type { Promotion, Campaign } from '@scayle/storefront/types'
import SFSlideIn from '@client/components/ui/core/SFSlideIn.vue'
import SFDealBanner from '@client/components/deal/SFDealBanner.vue'
import { getDealPlacement } from '@client/utils/promotion'

const { promotions, campaign } = defineProps<{
  /**
   * Promotions to list. `undefined` while the deferred `promotions` page prop
   * has not resolved, which holds the campaign card's impression until the
   * deal set size is known.
   */
  promotions?: Promotion[]
  campaign?: Campaign | null
}>()

const open = defineModel<boolean>('open', {
  type: Boolean,
  default: false,
})
</script>
