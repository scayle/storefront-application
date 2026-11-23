<template>
  <div class="space-y-6">
    <!-- Separator row with label -->
    <div class="flex items-center gap-3">
      <div class="h-px flex-1 bg-gray-300" />
      <span class="shrink-0 text-lg text-secondary">
        {{ $t('subscription.product.separation_text') }}
      </span>
      <div class="h-px flex-1 bg-gray-300" />
    </div>

    <!-- Card container -->
    <div
      class="space-y-4 rounded-lg border border-accent p-5"
      data-testid="subscription-service"
    >
      <!-- Heading -->
      <h2 class="heading-section-1">
        {{ $t('subscription.product.subscribe') }}
      </h2>

      <!-- State content -->
      <!-- Not eligible state -->
      <div v-if="variant && !isEligible" class="text-lg text-status-alert">
        {{ $t('subscription.product.not_eligible') }}
      </div>

      <!-- No variant selected state -->
      <div v-else-if="!variant" class="text-lg text-secondary">
        {{ $t('subscription.product.select_size') }}
      </div>

      <!-- Eligible state: show price and selection interface -->
      <template v-else>
        <!-- Subscription price: deferred-loaded. Rendered only once available;
             never falls back to the regular (non-discounted) price. The final
             discounted price is shown prominently with the labeled "Originally:"
             row beneath it and a price-information trigger next to the VAT note. -->
        <SFProductPrice
          v-if="subscriptionPrice"
          :price="subscriptionPrice"
          size="xl"
          show-tax-info
        />

        <!-- Selection interface -->
        <SFProductSubscriptionSelection
          v-model:selected-interval="selectedInterval"
          v-model:selected-delivery-day="selectedDeliveryDay"
          :intervals="intervals"
          :preferred-delivery-days="preferredDeliveryDays"
          :disabled="disabledState"
          :disabled-reason="disabledReason"
          @add-item-to-basket="handleAddItemToBasket"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/subscriptions
import { computed, ref, watch } from 'vue'
import type { WritableComputedRef } from 'vue'
import type {
  VariantPrice,
  DetailedProduct,
  ProductVariant,
} from '@scayle/storefront/types'
import type { AddToBasketInput } from '@client/composables/useBasket'
import { useI18n } from 'vue-i18n'
import type { PreferredDeliveryDate } from '@shared/types/Subscription'
import { PREFERRED_DELIVERY_DAYS } from '@shared/constants/subscription'
import { formatDeliveryDay } from '@shared/utils/subscription'
import SFProductPrice from '@client/components/product/SFProductPrice.vue'
import SFProductSubscriptionSelection from './SFProductSubscriptionSelection.vue'

const { product, variant, quantity, subscriptionPrice } = defineProps<{
  /**
   * The detailed product being viewed.
   */
  product: DetailedProduct

  /**
   * The currently selected variant, or undefined.
   */
  variant?: ProductVariant

  /**
   * The selected quantity.
   */
  quantity: number

  /**
   * Subscription-discounted price for the active variant, loaded deferred.
   */
  subscriptionPrice?: VariantPrice
}>()

const emit = defineEmits<{
  /**
   * Fired when the user clicks the "Add to Basket" button.
   * Payload is the item to add.
   */
  addItemToBasket: [
    item: {
      productName: string
      variantId: number
      quantity: number
      customData: AddToBasketInput['customData']
    },
  ]
}>()

const { t, locale } = useI18n()

const selectedIntervalValue = ref<string>('')
const selectedDeliveryDayValue = ref<number>(PREFERRED_DELIVERY_DAYS[0])

// A variant carries `subscription` only when it can be subscribed to, so its
// presence is the eligibility signal.
const isEligible = computed(() => !!variant?.subscription)
const intervals = computed(() => variant?.subscription?.intervals ?? [])

// Reset the selected interval whenever the variant's interval list changes.
watch(
  () => intervals.value.map((interval) => interval.value).join(','),
  () => {
    selectedIntervalValue.value = intervals.value[0]?.value ?? ''
  },
  { immediate: true, flush: 'sync' },
)

const selectedInterval: WritableComputedRef<
  { label: string; value: string } | undefined
> = computed({
  get: () =>
    intervals.value.find(
      (interval) => interval.value === selectedIntervalValue.value,
    ),
  set: (value) => {
    selectedIntervalValue.value = value?.value ?? ''
  },
})

// Delivery days, labelled with the full caption (e.g. "Every 15th of the month")
// to match the basket and order views. Every day here is a day of the month,
// so formatDeliveryDay always resolves.
const preferredDeliveryDays = computed<PreferredDeliveryDate[]>(() =>
  PREFERRED_DELIVERY_DAYS.map((day) => ({
    day,
    label: t('subscription.day_of_month_selection_caption', {
      dayOfMonth: formatDeliveryDay(day, locale.value, t),
    }),
  })),
)

const selectedDeliveryDay: WritableComputedRef<
  PreferredDeliveryDate | undefined
> = computed({
  get: () =>
    preferredDeliveryDays.value.find(
      (deliveryDay) => deliveryDay.day === selectedDeliveryDayValue.value,
    ),
  set: (value) => {
    selectedDeliveryDayValue.value = value?.day ?? PREFERRED_DELIVERY_DAYS[0]
  },
})

// The basket-add payload, or undefined when no variant or interval is selected.
// The item group is resolved server-side, so it is not part of this payload.
const itemToAdd = computed(() => {
  if (!variant || !selectedIntervalValue.value) {
    return undefined
  }

  const definition = {
    subscriptionInterval: selectedIntervalValue.value,
    subscriptionDeliveryDate: selectedDeliveryDayValue.value,
    subscriptionTerm: variant.subscription?.term,
    subscriptionCancellationPolicy: variant.subscription?.cancellationPolicy,
  }

  // No price promotion key: the server sets the subscription key itself once
  // it has verified the definition against the variant.
  return {
    productName: product.name,
    variantId: variant.id,
    quantity,
    customData: { subscriptionDefinition: definition },
  }
})

/** Disables the add button when the product is sold out or nothing is selected. */
const disabledState = computed(() => product.isSoldOut || !itemToAdd.value)

/** Explains why the button is disabled, read out via aria-describedby. */
const disabledReason = computed(() => {
  if (product.isSoldOut) {
    return t('common.sold_out')
  }
  return undefined
})

const handleAddItemToBasket = () => {
  if (itemToAdd.value) {
    emit('addItemToBasket', itemToAdd.value)
  }
}
</script>
