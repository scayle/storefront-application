<template>
  <div v-if="attributes.length > 0" data-testid="subscription-data">
    <p class="heading-section-3" data-testid="main-label">
      {{ $t('subscription.label') }}
    </p>
    <div class="mt-1 space-y-1">
      <SFLabelValue
        v-for="(attr, index) in attributes"
        :key="`subscription-attr-${index}`"
        :label="attr.label"
        :value="attr.value"
        tag="p"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  SubscriptionDefinition,
  VariantSubscription,
} from '@scayle/storefront/types'
import { formatDeliveryDay } from '@shared/utils/subscription'
import SFLabelValue from '@client/components/ui/core/SFLabelValue.vue'

/** A resolved label/value row of this component's subscription summary. */
interface SubscriptionAttribute {
  /** Localized field label (e.g. "Interval"). */
  label: string
  /** Localized field value (e.g. "Monthly"). */
  value: string
}

const { definition, subscription } = defineProps<{
  /**
   * The subscription payload stored on the basket or order item. Undefined for
   * regular items, which render nothing.
   */
  definition?: SubscriptionDefinition
  /**
   * The item variant's subscription options, used to resolve the interval label
   * for the stored interval value.
   */
  subscription?: VariantSubscription
}>()

const { t, locale } = useI18n()

/** The label/value rows shown for a subscription item. */
const attributes = computed<SubscriptionAttribute[]>(() => {
  if (!definition) {
    return []
  }

  const rows: SubscriptionAttribute[] = []

  // Order items arrive with a stripped variant, so the matching interval option
  // is often missing. Fall back to the raw stored value so the interval row,
  // the key subscription attribute, always shows (`subscriptionInterval` is
  // never empty on a stored definition).
  rows.push({
    label: t('subscription.interval'),
    value:
      subscription?.intervals.find(
        (option) => option.value === definition.subscriptionInterval,
      )?.label ?? definition.subscriptionInterval,
  })

  // Show the delivery day as the full caption (e.g. "Every 15th of the month")
  // so the basket and order views read like the PDP selection.
  if (definition.subscriptionDeliveryDate) {
    const deliveryDay = formatDeliveryDay(
      Number(definition.subscriptionDeliveryDate),
      locale.value,
      t,
    )
    if (deliveryDay) {
      rows.push({
        label: t('subscription.follow_up_delivery'),
        value: t('subscription.day_of_month_selection_caption', {
          dayOfMonth: deliveryDay,
        }),
      })
    }
  }

  // Term and cancellation policy stay out of the basket and order summary on
  // purpose. V2 lists only the interval and the follow-up delivery here.
  return rows
})
</script>
