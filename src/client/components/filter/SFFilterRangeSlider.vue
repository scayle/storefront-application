<template>
  <div>
    <div class="mx-2">
      <!--
        `min-label` / `max-label` are intentionally not passed: they embed the
        current value and would double-announce against `aria-valuetext` on
        every step. Group name comes from the surrounding `<fieldset>`.
      -->
      <SFRangeSlider
        v-model="range"
        :min="roundDownPrice(min)"
        :max="roundUpPrice(max)"
        :step="10 ** decimalPlaces"
        :format-value="formatTooltip"
        @dragend="emit('dragend', $event)"
        @click="emit('click', $event)"
      >
        <template #tooltip="{ value }">
          <div class="mb-8 rounded-sm bg-gray-300 p-1 text-sm text-secondary">
            {{ formatTooltip(value) }}
          </div>
        </template>
      </SFRangeSlider>
    </div>
    <div class="mt-4 flex items-center">
      <SFRangeInput
        :variant="filterSlug === 'prices' ? 'price' : 'percentage'"
        :model-value="range[0]"
        :min="roundDownPrice(min)"
        :max="range[1]"
        :currency-code="country.currency.currencyCode"
        :country="country"
        :format-options="{
          minimumFractionDigits: 0,
        }"
        :aria-label="minLabel"
        @update:model-value="changeRangeAtIndex(roundDownPrice($event), 0)"
        @clamp="onClamp"
      />
      <div class="mx-auto text-center text-sm font-semibold text-secondary">
        {{ $t('filter_range_slider.to') }}
      </div>
      <SFRangeInput
        :variant="filterSlug === 'prices' ? 'price' : 'percentage'"
        :model-value="range[1]"
        :min="range[0]"
        :max="roundUpPrice(max)"
        :currency-code="country.currency.currencyCode"
        :country="country"
        :format-options="{
          minimumFractionDigits: 0,
        }"
        :aria-label="maxLabel"
        @update:model-value="changeRangeAtIndex(roundUpPrice($event), 1)"
        @clamp="onClamp"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { roundDown, roundUp } from '@client/utils/math'
import type { RangeTuple } from '@scayle/storefront/types'
import { computed } from 'vue'
import { getDecimalPlacesForCurrency } from '@client/utils/i18n'
import { useI18n } from 'vue-i18n'
import { formatPercentage } from '@shared/utils/formatter'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'
import { useAnnouncer } from '@client/composables/useAnnouncer'
import SFRangeSlider from '@client/components/ui/form/SFRangeSlider.vue'
import SFRangeInput from '@client/components/ui/form/SFRangeInput.vue'

const {
  min = 0,
  max = 100000,
  filterSlug,
} = defineProps<{
  /** Determines the type of filtering and formatting. "prices" for currency, "max_savings_percentage" for discount percentages. */
  filterSlug: 'prices' | 'max_savings_percentage'
  /** Minimum value for the range slider. For prices, this should be in minor units (e.g., cents). */
  min?: number
  /** Maximum value for the range slider. For prices, this should be in minor units (e.g., cents). */
  max?: number
}>()

const emit = defineEmits<{
  /** Emitted when the range value changes. Used for v-model binding. */
  'update:modelValue': [range: RangeTuple]
  /** Emitted when the user finishes dragging a slider thumb. Use this to apply the filter. */
  dragend: [range: RangeTuple]
  /** Emitted when the user clicks a slider thumb without dragging. Use this to apply the filter. */
  click: [range: RangeTuple]
  /** Emitted when the user commits a value via the numeric input fields. Use this to apply the filter. */
  inputFieldUpdate: [range: RangeTuple]
}>()

const country = useStorefrontConfig().country
/**
 * Price calculations:
 *
 * Prices are stored as integers in the minor unit of a currency (e.g. cents).
 *
 * In order to convert between the minor unit and major unit we need to know how many decimal places or how many minor units per major unit.
 * In most cases this is 2. There are 100 cents to a Euro, so conversions are dividing or multiplying by 100. But since this is not always
 * the case we determine the number of decimal places using the Intl.NumberFormat API then divide or multiple by 10 by decimalPlaces (or`10 ** decimalPlaces` in JS).
 * We do not handle currencies which use non-decimal fractions.
 */

const decimalPlaces = computed(() => {
  if (filterSlug === 'max_savings_percentage') {
    return 0
  }

  if (!country.value.currency.currencyCode) {
    return 2
  }

  return getDecimalPlacesForCurrency(country.value.currency.currencyCode)
})

/**
 * Round the price down to a whole value
 * @param price
 */
const roundDownPrice = (price: number) => {
  return roundDown(price, 10 ** decimalPlaces.value)
}

/**
 * Round the price up to a whole value
 * @param price
 */
const roundUpPrice = (price: number) => {
  return roundUp(price, 10 ** decimalPlaces.value)
}

const range = defineModel<RangeTuple>({
  required: true,
  set: ([min, max]) => [roundDownPrice(min), roundUpPrice(max)],
  get: ([min, max]) => [roundDownPrice(min), roundUpPrice(max)],
})

const changeRangeAtIndex = (newRangeValue: number, index: 0 | 1) => {
  const updatedRange: RangeTuple = [...range.value]
  updatedRange[index] = newRangeValue
  const rounded: RangeTuple = [
    roundDownPrice(updatedRange[0]),
    roundUpPrice(updatedRange[1]),
  ]
  range.value = rounded
  emit('update:modelValue', rounded)
  emit('inputFieldUpdate', rounded)
}

const formatCurrency = (value: number): string => {
  return (value / 10 ** decimalPlaces.value).toLocaleString(
    country.value.locale,
    {
      style: 'currency',
      currency: country.value.currency.currencyCode,
      minimumFractionDigits: 0,
    },
  )
}

// Shared by the tooltip slot and the slider's `formatValue` so the tooltip
// and `aria-valuetext` stay in sync.
const formatTooltip = (value: number): string => {
  if (filterSlug === 'prices') {
    return formatCurrency(value)
  }
  return formatPercentage(value / 100, country.value)
}

const { t } = useI18n()
const { announce } = useAnnouncer()
const maxLabel = computed(() => {
  if (filterSlug === 'prices') {
    return t('filter_range_slider.price.maximum', {
      price: formatCurrency(range.value[1]),
    })
  }

  return t('filter_range_slider.percentage.maximum', {
    reduction: formatPercentage(range.value[1] / 100, country.value),
  })
})
const minLabel = computed(() => {
  if (filterSlug === 'prices') {
    return t('filter_range_slider.price.minimum', {
      price: formatCurrency(range.value[0]),
    })
  }

  return t('filter_range_slider.percentage.minimum', {
    reduction: formatPercentage(range.value[0] / 100, country.value),
  })
})

// Announce when a typed value is clamped to min/max, routed through the shared
// polite live region.
const onClamp = ({
  requested,
  applied,
}: {
  requested: number
  applied: number
}) => {
  announce(
    requested > applied
      ? t('filter_range_slider.a11y.value_clamped_to_max')
      : t('filter_range_slider.a11y.value_clamped_to_min'),
  )
}
</script>
