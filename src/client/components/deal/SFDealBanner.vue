<template>
  <component
    :is="componentName"
    ref="root"
    v-bind="attributes"
    :aria-label="componentName === SFLink ? deal.headline : undefined"
    class="relative block w-full rounded-xl border text-white"
    :style="{ borderColor: deal.color.backgroundColor }"
    @click="onSelect"
  >
    <template v-if="deal.schedule.to && !deal.hideCountdown">
      <ClientOnly>
        <template #fallback>
          <SFCountdownSkeleton
            size="small"
            :time-until="deal.schedule.to"
            class="absolute z-10 translate-x-6 -translate-y-1/2"
          />
        </template>
        <SFCountdownSmall
          class="absolute z-10 translate-x-6 -translate-y-1/2"
          :time-until="deal.schedule.to"
          data-testid="promotion-countdown"
        />
      </ClientOnly>
    </template>
    <div
      class="-m-px flex items-center justify-between rounded-xl px-6 py-4"
      :style="deal.color"
    >
      <div>
        <div class="font-bold">{{ deal.headline }}</div>
        <div v-if="deal.subline" class="text-md">
          {{ deal.subline }}
        </div>
      </div>
    </div>
    <div v-if="showTextBox">
      <SFPromotionProgressWrapper
        v-if="isTieredPromotion(deal)"
        :promotion="deal"
      />

      <template v-else>
        <div class="flex flex-col px-6 py-4 text-md text-secondary">
          {{ text }}
        </div>
      </template>
      <div
        v-if="deal.conditions && showCondition"
        class="flex flex-col px-6 py-4 text-md text-secondary"
      >
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1">
            <IconNotifyInfo class="size-4" />
            {{ $t('promotion.condition') }}
          </div>
          <div class="text-sm whitespace-break-spaces">
            {{ deal.conditions }}
          </div>
        </div>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useVisibilityTracking } from '@client/composables/useVisibilityTracking'
import SFLink from '@client/components/ui/links/SFLink.vue'
import IconNotifyInfo from '@assets/icons/notify/info.svg'
import type { Promotion, Campaign } from '@scayle/storefront/types'
import type { PromotionPlacement } from '@client/utils/promotion'
import { isTieredPromotion } from '@client/utils/promotion'
import { useI18n } from 'vue-i18n'
import SFCountdownSmall from '@client/components/ui/core/SFCountdownSmall.vue'
import SFCountdownSkeleton from '@client/components/ui/core/SFCountdownSkeleton.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import SFPromotionProgressWrapper from '@client/components/deal/SFPromotionProgressWrapper.vue'
import { useDealTracking } from '@client/composables/tracking/useDealTracking'
import { useBasket } from '@client/composables/useBasket'

const {
  deal,
  placement,
  showCondition = false,
  showTextBox = true,
} = defineProps<{
  /**
   * The deal to display.
   */
  deal: Promotion | Campaign
  /**
   * Surface, position and set size reported on the SCAYLE Analytics promotion
   * events. Build it with `getDealPlacement` so the campaign-offset rule stays
   * in one place. `undefined` while the surface has not resolved its deal set,
   * which holds the impression until it has.
   */
  placement: PromotionPlacement | undefined
  /**
   * Controls the visibility of promotion conditions.
   */
  showCondition?: boolean
  /**
   * Controls the visibility of the text box.
   */
  showTextBox?: boolean
}>()

const { t } = useI18n()
const { basket, isGiftPromotionApplicable } = useBasket()

const componentName = computed(() => (deal.link ? SFLink : 'div'))

const attributes = computed(() => ({
  ...(deal.link && { raw: true, to: deal.link }),
}))

// Resolves the basket-level reduction for this promotion. Present iff the
// promotion has reduced the current basket total — used to drive the
// applied-state copy and the displayed amount.
const appliedReduction = computed(() =>
  basket.value?.cost.promotionReductionsPerPromotion.find(
    (reduction) => reduction.id === deal.id,
  ),
)

const text = computed(() => {
  // A free gift has no reduction until it is in the basket, so the reduction
  // alone lags behind the gift panel.
  if (isGiftPromotionApplicable(deal.id)) {
    return t('promotion_banner.unlocked_buy_x_get_y')
  }

  if (appliedReduction.value) {
    return t('promotion_banner.unlocked', {
      amount: appliedReduction.value.total,
    })
  }

  return t('promotion_banner.locked')
})

const { onVisible, onSelect } = useDealTracking(
  () => deal,
  () => placement,
)

const root = useTemplateRef('root')
useVisibilityTracking(root, onVisible)
</script>
