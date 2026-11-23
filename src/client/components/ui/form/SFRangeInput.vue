<!-- eslint-disable vuejs-accessibility/form-control-has-label -- The parent names the input with `aria-label`, which falls through to this root element. -->
<template>
  <input
    type="text"
    inputmode="decimal"
    class="h-10 w-[100px] rounded-sm border border-gray-200 bg-gray-200 text-center text-sm font-semibold text-primary"
    data-testid="price-input"
    :value="displayValue"
    @focus="onFocus"
    @blur="onBlur"
    @change="onChange($event)"
  />
</template>
<!-- eslint-enable vuejs-accessibility/form-control-has-label -->

<script setup lang="ts">
/**
 * Numeric range input. Always `type="text"` with `inputmode="decimal"`;
 * formatting toggles via the displayed value, not the DOM type.
 *
 * Parsing is locale-aware (DE `12,99` → `12.99`). On clamp to `min`/`max`,
 * emits `clamp` so the consumer can surface a polite live-region message.
 */
import { computed, ref } from 'vue'
import { formatPercentage } from '@shared/utils/formatter'
import type { SharedStorefrontCountry } from '@scayle/storefront'

const { variant, country, currencyCode, min, max, modelValue, formatOptions } =
  defineProps<{
    /** `price` formats the value as currency, `percentage` as a whole percent. */
    variant: 'price' | 'percentage'
    /** Current value. Prices are integer minor units (cents), percentages whole numbers. */
    modelValue: number
    /** ISO 4217 code that sets the currency symbol and the number of decimal places. */
    currencyCode: string
    /** Active country. Its locale sets the separators used for display and parsing. */
    country: SharedStorefrontCountry
    /** Largest accepted value, in the same unit as `modelValue`. Larger input is clamped. */
    max: number
    /** Smallest accepted value, in the same unit as `modelValue`. Smaller input is clamped. */
    min: number
    /** Extra `Intl.NumberFormat` options merged into the currency format, e.g. to drop the decimals. */
    formatOptions?: Intl.NumberFormatOptions | null
  }>()

const emit = defineEmits<{
  /** Emits the parsed, rounded and clamped value when the user changes the field to a different value. */
  'update:modelValue': [value: number]
  /** Emits the rounded value the user typed and the bound it was clamped to, so the parent can announce the correction. */
  clamp: [{ requested: number; applied: number }]
  /** Re-emits the native focus event after the field switches to the plain number. */
  focus: [FocusEvent]
  /** Re-emits the native blur event after the field switches back to the formatted value. */
  blur: [FocusEvent]
}>()

const isActive = ref(false)

const decimalPlaces = computed(() => {
  if (variant === 'percentage') {
    return 0
  }
  if (!currencyCode) {
    return 2
  }

  const parts = new Intl.NumberFormat(country.locale, {
    style: 'currency',
    currency: currencyCode,
  }).formatToParts(0)

  const fraction = parts.find((p) => p.type === 'fraction')

  if (!fraction) {
    return 0
  }

  return fraction.value.length
})

const decimalSeparator = computed(() => {
  const parts = new Intl.NumberFormat(country.locale).formatToParts(1.1)
  return parts.find((p) => p.type === 'decimal')?.value ?? '.'
})

const formatCurrency = (value: number): string => {
  return (value / 10 ** decimalPlaces.value).toLocaleString(country.locale, {
    style: 'currency',
    currency: currencyCode,
    ...formatOptions,
  })
}

const displayValue = computed(() => {
  if (variant === 'percentage') {
    if (!isActive.value) {
      return formatPercentage(modelValue / 100, country)
    }
    return modelValue
  }
  if (!isActive.value) {
    return formatCurrency(modelValue)
  }
  return modelValue / 10 ** decimalPlaces.value
})

const onFocus = (e: FocusEvent) => {
  isActive.value = true
  emit('focus', e)
}

const onBlur = (e: FocusEvent) => {
  isActive.value = false
  emit('blur', e)
}

const onChange = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value

  const normalized = raw
    .replace(new RegExp(`[^0-9${decimalSeparator.value}]`, 'g'), '')
    .replace(decimalSeparator.value, '.')
  const parsed = parseFloat(normalized)

  if (isNaN(parsed)) {
    return
  }

  const adjusted = Math.round(parsed) * 10 ** decimalPlaces.value
  const clamped = Math.min(Math.max(min, adjusted), max)

  if (clamped !== adjusted) {
    emit('clamp', { requested: adjusted, applied: clamped })
  }

  if (modelValue !== clamped) {
    emit('update:modelValue', clamped)
  }
}
</script>
