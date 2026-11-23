<template>
  <div class="flex max-w-[70%] flex-col gap-1">
    <!--
      A highlight (page promotion or CMS override) shows a single deal badge and
      replaces the campaign and promotion badges. Otherwise the campaign badge
      and all promotion badges render.
    -->
    <template v-if="isHighlightActive">
      <SFDealBadge
        v-if="highlightBadgeLabel || !hideDefaultHighlightBadge"
        :text="highlightBadgeLabel || $t('promotion.deal')"
        :style="highlightBadgeStyle"
      />
    </template>
    <template v-else>
      <SFDealBadge
        v-if="campaign && product.price.hasCampaignReduction"
        :text="campaign.badgeLabel || $t('campaign.deal')"
        :style="campaign.color"
      />
      <SFDealBadge
        v-for="promotionBadge in promotions"
        :key="promotionBadge.id"
        :text="promotionBadge.product?.badgeLabel || $t('promotion.deal')"
        :style="promotionBadge.color"
      />
    </template>
    <SFProductBadge
      v-if="product.isLowStock"
      data-testid="product-badge-low-stock"
      :text="$t('badge_labels.low_stock')"
      class="bg-status-warning-light!"
    />
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type {
  ListingProduct,
  Promotion,
  Campaign,
} from '@scayle/storefront/types'
import SFDealBadge from '@client/components/deal/SFDealBadge.vue'
import SFProductBadge from '@client/components/product/SFProductBadge.vue'

interface Props {
  promotions: Promotion[]
  campaign: Campaign | null
  product: ListingProduct
  /**
   * Whether a highlight (page promotion or CMS override) is active. When true,
   * the single highlight deal badge replaces the campaign and promotion badges.
   */
  isHighlightActive?: boolean
  /** Background and text color for the highlight deal badge. */
  highlightBadgeStyle?: Pick<CSSProperties, 'backgroundColor' | 'color'>
  /** Highlight deal-badge label. Falls back to the default "Deal" label. */
  highlightBadgeLabel?: string
  /**
   * When true, the highlight deal badge is hidden if no explicit badge label is
   * set, instead of falling back to the default "Deal" label.
   */
  hideDefaultHighlightBadge?: boolean
}

const {
  promotions,
  campaign,
  product,
  isHighlightActive = false,
  highlightBadgeStyle,
  highlightBadgeLabel,
  hideDefaultHighlightBadge = false,
} = defineProps<Props>()
</script>
