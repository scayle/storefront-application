<template>
  <SFButton
    variant="raw"
    class="relative flex size-9.5 items-center justify-center rounded-md p-2 text-primary! hover:bg-gray-200 aria-busy:animate-pulse aria-busy:cursor-progress motion-reduce:aria-busy:opacity-50"
    data-testid="promotion-header-button"
    aria-haspopup="dialog"
    v-bind="triggerAttrs"
    :aria-label="
      promotionCount
        ? $t('promotion_slide_in.open_button.active_promotions_title', {
            total: promotionCount,
          })
        : $t('promotion_slide_in.open_button.no_active_promotions_title')
    "
    @click="open()"
  >
    <IconCommercePromotion class="size-6! shrink-0" />
    <SFCountBadge
      :count="promotionCount"
      variant="corner"
      aria-hidden="true"
      data-testid="header-promotion-count"
    />
  </SFButton>
</template>

<script setup lang="ts">
import IconCommercePromotion from '@assets/icons/commerce/promotion.svg'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFCountBadge from '@client/components/ui/core/SFCountBadge.vue'
import { useOverlay } from '@client/composables/useOverlay'
import { usePage } from '@client/composables/usePage'

const { promotionCount } = defineProps<{
  /** Number of running promotions and campaigns, shown as a badge. */
  promotionCount: number
}>()

const page = usePage()

const { triggerAttrs, open } = useOverlay().create(
  () => import('./SFPromotionSlideIn.vue'),
  {
    props: () => ({
      promotions: page.props.promotions,
      campaign: page.props.campaign,
    }),
  },
)
</script>
