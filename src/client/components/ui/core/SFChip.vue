<template>
  <div
    v-if="isDismissable"
    class="inline-flex h-7 items-center gap-1 rounded-md pr-2 pl-3 text-sm transition"
    :class="dismissableClass"
    :aria-disabled="disabled || undefined"
    data-testid="chip-dismissable"
  >
    <span :class="disabled ? 'font-normal' : 'font-semibold'">
      <slot />
    </span>
    <button
      type="button"
      class="hit-area-min inline-flex size-4 cursor-pointer items-center justify-center text-current disabled:cursor-not-allowed"
      :aria-label="resolvedDismissAriaLabel"
      :disabled="disabled"
      data-testid="chip-dismiss"
      @click="emit('dismiss', item)"
    >
      <IconNavigationClose aria-hidden="true" class="size-3" />
    </button>
  </div>

  <label
    v-else
    class="group relative inline-flex items-stretch"
    :class="{ 'cursor-not-allowed': disabled }"
    data-testid="chip"
  >
    <input
      v-model="model"
      :value="item"
      :type="inputType"
      :disabled="disabled"
      :aria-label="inputAriaLabel"
      class="peer absolute inset-0 size-full cursor-pointer appearance-none disabled:cursor-not-allowed"
      :class="radiusClass"
      data-testid="chip-input"
    />
    <span
      class="inline-flex items-center justify-center transition"
      :class="selectableClass"
    >
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts" generic="T">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import { ChipSubType, ChipVariant } from '@client/utils/constants'

const {
  variant = ChipVariant.MULTI_SELECT,
  subType,
  item,
  disabled = false,
  inputAriaLabel,
  dismissAriaLabel,
} = defineProps<{
  /**
   * Visual + behavioral variant of the chip. See `ChipVariant`.
   */
  variant?: ChipVariant
  /**
   * Color scheme for the Dismissable variant. Required when
   * `variant === ChipVariant.DISMISSABLE`, ignored otherwise.
   */
  subType?: ChipSubType
  /**
   * Value associated with this chip. Included in the `v-model` array
   * (multi-select) or assigned to the model (single-select / choice).
   * Emitted in the `dismiss` event for the dismissable variant.
   */
  item: T
  /**
   * Renders the chip in its disabled state and prevents interaction.
   */
  disabled?: boolean
  /**
   * Accessibility label forwarded to the hidden `<input>` for
   * selectable variants. Should describe both the action and context.
   */
  inputAriaLabel?: string
  /**
   * Accessibility label for the dismiss button. Defaults to the
   * translated "Remove <slot text>" (`chip.remove_item`), or "Remove"
   * (`chip.remove`) when the slot has no text. Ignored for non-dismissable
   * variants.
   */
  dismissAriaLabel?: string
}>()

const emit = defineEmits<{
  /**
   * Emitted when the user activates the dismiss button on a
   * `dismissable` chip. The payload is the chip's `item` value so
   * callers can locate the entry to remove from their list.
   */
  dismiss: [item: T]
}>()

const model = defineModel<T | T[]>()
const slots = useSlots()
const { t } = useI18n()

const isSingleSelect = computed(() => variant === ChipVariant.SINGLE_SELECT)
const isMultiSelect = computed(() => variant === ChipVariant.MULTI_SELECT)
const isChoice = computed(() => variant === ChipVariant.CHOICE)
const isDismissable = computed(() => variant === ChipVariant.DISMISSABLE)

const inputType = computed(() => (isMultiSelect.value ? 'checkbox' : 'radio'))

const radiusClass = computed(() => {
  if (isSingleSelect.value) {
    return 'rounded-full'
  }
  if (isMultiSelect.value) {
    return 'rounded-lg'
  }
  if (isChoice.value) {
    return 'rounded-xl'
  }
  return ''
})

const selectableClass = computed(() => {
  if (isSingleSelect.value) {
    return [
      'h-10 px-4 rounded-full text-md font-semibold',
      'bg-gray-200 text-secondary',
      'peer-hover:bg-white peer-hover:ring-1 peer-hover:ring-inset peer-hover:ring-gray-400 peer-hover:text-primary peer-hover:shadow-input',
      'peer-checked:bg-white peer-checked:ring-2 peer-checked:ring-inset peer-checked:ring-primary peer-checked:text-primary peer-checked:shadow-none',
      'peer-disabled:!bg-gray-100 peer-disabled:!ring-1 peer-disabled:!ring-inset peer-disabled:!ring-gray-300 peer-disabled:!text-gray-500 peer-disabled:!font-normal peer-disabled:!shadow-none',
    ].join(' ')
  }

  if (isMultiSelect.value) {
    return [
      'h-10 px-4 rounded-lg text-sm font-semibold',
      'bg-white text-primary ring-1 ring-inset ring-gray-400',
      'peer-hover:ring-2 peer-hover:ring-inset peer-hover:ring-accent peer-hover:shadow-input',
      'peer-checked:bg-accent peer-checked:text-white peer-checked:ring-0 peer-checked:shadow-none',
      'peer-disabled:!bg-gray-100 peer-disabled:!ring-1 peer-disabled:!ring-inset peer-disabled:!ring-gray-300 peer-disabled:!text-gray-500 peer-disabled:!font-normal peer-disabled:!shadow-none',
    ].join(' ')
  }

  if (isChoice.value) {
    return [
      'h-11 px-8 rounded-xl text-md font-semibold',
      'bg-gray-200 text-secondary',
      'peer-hover:bg-white peer-hover:ring-1 peer-hover:ring-inset peer-hover:ring-gray-400 peer-hover:text-primary peer-hover:shadow-input',
      'peer-checked:bg-white peer-checked:ring-2 peer-checked:ring-inset peer-checked:ring-primary peer-checked:text-primary peer-checked:shadow-none',
      'peer-disabled:!bg-gray-100 peer-disabled:!ring-1 peer-disabled:!ring-inset peer-disabled:!ring-gray-300 peer-disabled:!text-gray-500 peer-disabled:!font-normal peer-disabled:!shadow-none',
    ].join(' ')
  }

  return ''
})

const dismissableClass = computed(() => {
  if (disabled) {
    return 'bg-gray-100 border border-gray-300 text-gray-500'
  }
  if (subType === ChipSubType.VOUCHER) {
    return 'bg-status-info border border-transparent text-primary hover:bg-white hover:border-gray-400 hover:shadow-input'
  }
  if (subType === ChipSubType.PROMOTION) {
    return 'bg-promotion border border-transparent text-primary hover:border-primary hover:shadow-input'
  }
  return ''
})

const slotText = (): string => {
  const nodes = slots.default?.() ?? []
  return nodes
    .map((node) => (typeof node.children === 'string' ? node.children : ''))
    .join('')
    .trim()
}

const resolvedDismissAriaLabel = computed(() => {
  if (dismissAriaLabel) {
    return dismissAriaLabel
  }
  const label = slotText()
  return label ? t('chip.remove_item', { name: label }) : t('chip.remove')
})
</script>
