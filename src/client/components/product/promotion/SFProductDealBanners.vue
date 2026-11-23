<template>
  <div
    v-if="showCampaign || promotions?.length"
    class="mt-4 mb-2 flex flex-col gap-6"
  >
    <SFDealBanner
      v-if="showCampaign && campaign"
      :deal="campaign"
      :show-text-box="false"
      :placement="getDealPlacement('pdp_banner', promotions, true, 'campaign')"
    />

    <!--
      NOTE: As there is no limit on the number of promotions, too many `promotions`
      can cause a crowding effect of deal badges on the image and potentially influence
      rendering performance.
    -->

    <SFDealBanner
      v-for="(promotion, index) in promotions"
      :key="promotion.id"
      :deal="promotion"
      :placement="
        getDealPlacement('pdp_banner', promotions, showCampaign, index)
      "
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  ProductPrice,
  VariantPrice,
  Campaign,
  Promotion,
} from '@scayle/storefront/types'
import SFDealBanner from '@client/components/deal/SFDealBanner.vue'
import { getDealPlacement } from '@client/utils/promotion'

interface Props {
  /**
   * Promotions to render a deal banner for. `undefined` while the deferred
   * `promotions` page prop has not resolved, which keeps the deal set size
   * unknown and holds the campaign banner's impression until it is.
   */
  promotions: Promotion[] | undefined

  /** The campaign to render a deal banner for, if any. */
  campaign: Campaign | null

  /** The PDP-scoped price (product or active variant), used to gate the campaign banner via its `hasCampaignReduction` flag. */
  price: ProductPrice | VariantPrice
}

const { promotions, campaign, price } = defineProps<Props>()

const showCampaign = computed(() =>
  Boolean(campaign && price.hasCampaignReduction),
)
</script>
