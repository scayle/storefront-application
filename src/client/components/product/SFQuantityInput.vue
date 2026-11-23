<!-- eslint-disable vuejs-accessibility/interactive-supports-focus -- The bound `tabindex` is 0, or -1 while the control is disabled. -->
<template>
  <div
    ref="spinbuttonRef"
    role="spinbutton"
    :aria-label="accessibleLabel"
    :aria-valuenow="quantity"
    :aria-valuemin="minQuantity"
    :aria-valuemax="maxQuantity"
    :aria-disabled="isControlDisabled || undefined"
    :aria-busy="loading || undefined"
    :tabindex="isControlDisabled ? -1 : 0"
    :class="containerClasses"
    data-testid="quantity-selector"
    @keydown="onKeydown"
  >
    <button
      type="button"
      :aria-disabled="isDecrementDisabled || undefined"
      :aria-label="
        $t('quantity_input.change_value_to', { newQuantity: quantity - 1 })
      "
      tabindex="-1"
      :class="decrementButtonClasses"
      data-testid="quantity-minus"
      @click="onDecrementClick"
    >
      <IconIncrementMinus :class="decrementIconClasses" aria-hidden="true" />
    </button>

    <span aria-hidden="true" :class="valueClasses" data-testid="quantity-value">
      {{ quantity }}
    </span>

    <button
      type="button"
      :aria-disabled="isIncrementDisabled || undefined"
      :aria-label="
        $t('quantity_input.change_value_to', { newQuantity: quantity + 1 })
      "
      tabindex="-1"
      :class="incrementButtonClasses"
      data-testid="quantity-plus"
      @click="onIncrementClick"
    >
      <IconIncrementPlus :class="incrementIconClasses" aria-hidden="true" />
    </button>
  </div>
</template>
<!-- eslint-enable vuejs-accessibility/interactive-supports-focus -->

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeydownActions } from '@client/composables/useKeydownActions'
import IconIncrementMinus from '@assets/icons/increment/minus.svg'
import IconIncrementPlus from '@assets/icons/increment/plus.svg'
import { Size } from '@client/utils/constants'
import type { Size as SizeType } from '@client/utils/constants'

const {
  maxQuantity,
  minQuantity = 1,
  disabled = false,
  loading = false,
  size = Size.MD,
  label,
} = defineProps<{
  /**
   * Maximum quantity the user can select (typically variant stock).
   */
  maxQuantity: number
  /**
   * Minimum quantity. The decrement control is disabled at this value.
   */
  minQuantity?: number
  /**
   * Disables the whole control (container and both increment buttons).
   */
  disabled?: boolean
  /**
   * Skeleton placeholder while the parent updates basket quantity.
   */
  loading?: boolean
  /**
   * Container height and increment-button footprint per the Figma Sizes table.
   */
  size?: SizeType
  /**
   * Accessible name for the spinbutton. Defaults to the "Quantity" translation.
   */
  label?: string
}>()

defineEmits<{
  /**
   * Emitted when the quantity is updated.
   */
  'update:quantity': [quantity: number]
}>()

/**
 * Current quantity bound with `v-model:quantity`.
 */
const quantity = defineModel<number>('quantity', { required: true })

const { t } = useI18n()
const spinbuttonRef = useTemplateRef<HTMLDivElement>('spinbuttonRef')

const accessibleLabel = computed(() => label ?? t('global.quantity'))

const isControlDisabled = computed(() => disabled || loading)

const isAtMin = computed(() => quantity.value <= minQuantity)

const isAtMax = computed(() => quantity.value >= maxQuantity)

const isDecrementDisabled = computed(
  () => isControlDisabled.value || isAtMin.value,
)

const isIncrementDisabled = computed(
  () => isControlDisabled.value || isAtMax.value,
)

const CONTAINER_SIZE_CLASSES: Record<SizeType, string> = {
  [Size.SM]: 'h-8 gap-2 p-1',
  [Size.MD]: 'h-10 gap-2 p-2',
  [Size.LG]: 'h-12 gap-2 p-2',
  [Size.XL]: 'h-12 gap-2 p-2',
}

const BUTTON_SIZE_CLASSES: Record<SizeType, string> = {
  [Size.SM]: 'size-6 shrink-0 rounded-md',
  [Size.MD]: 'size-7 shrink-0 rounded-md',
  [Size.LG]: 'size-8 shrink-0 rounded-md',
  [Size.XL]: 'size-8 shrink-0 rounded-md',
}

const containerClasses = computed(() => {
  const sizeClasses = CONTAINER_SIZE_CLASSES[size]

  if (loading) {
    return [
      sizeClasses,
      'inline-flex items-center rounded-lg border border-gray-300 border-solid bg-white',
      'pointer-events-none cursor-default',
    ]
  }

  if (disabled) {
    return [
      sizeClasses,
      'inline-flex items-center rounded-lg border border-disabled border-solid bg-white',
      'text-disabled pointer-events-none cursor-not-allowed',
    ]
  }

  return [
    sizeClasses,
    'inline-flex items-center rounded-lg border border-solid bg-white',
    'border-gray-300 text-primary',
    'hover:border-gray-400',
    'focus-visible:focus-style-inset',
  ]
})

const valueClasses = computed(() => [
  'min-w-[2ch] shrink-0 text-center font-normal tabular-nums select-none',
  size === Size.LG || size === Size.XL ? 'text-lg' : 'text-md',
  {
    'text-disabled': disabled && !loading,
    'text-primary': !disabled || loading,
  },
])

const incrementButtonClasses = computed(() =>
  buildButtonClasses(isIncrementDisabled.value),
)

const decrementButtonClasses = computed(() =>
  buildButtonClasses(isDecrementDisabled.value),
)

const incrementIconClasses = computed(() =>
  buildIconClasses(isIncrementDisabled.value),
)

const decrementIconClasses = computed(() =>
  buildIconClasses(isDecrementDisabled.value),
)

// Inset, because the bordered shell around the two buttons clips an
// outward ring.
const buttonFocusClasses = 'focus-visible:focus-style-inset'

function buildButtonClasses(isButtonDisabled: boolean) {
  const sizeClasses = BUTTON_SIZE_CLASSES[size]

  if (isButtonDisabled) {
    return [
      sizeClasses,
      'inline-flex cursor-not-allowed items-center justify-center bg-gray-100',
    ]
  }

  return [
    sizeClasses,
    'group/increment inline-flex items-center justify-center bg-gray-200',
    'hover:bg-gray-300',
    buttonFocusClasses,
  ]
}

function buildIconClasses(isButtonDisabled: boolean) {
  if (loading) {
    return 'size-3 fill-gray-400'
  }

  if (isButtonDisabled) {
    return 'size-3 fill-disabled'
  }

  return 'size-3 fill-secondary group-hover/increment:fill-primary'
}

function focusSpinbutton() {
  spinbuttonRef.value?.focus()
}

function setQuantity(next: number) {
  if (isControlDisabled.value) {
    return
  }

  const clamped = Math.min(maxQuantity, Math.max(minQuantity, next))
  if (clamped !== quantity.value) {
    quantity.value = clamped
  }
}

function increment() {
  setQuantity(quantity.value + 1)
}

function decrement() {
  setQuantity(quantity.value - 1)
}

function onIncrementClick() {
  // The buttons use `aria-disabled` instead of native `disabled`, so the click
  // handler still fires at max. Guard explicitly (the clamp in `setQuantity`
  // already makes it a no-op, but the early return keeps intent clear).
  if (isIncrementDisabled.value) {
    return
  }
  increment()
  focusSpinbutton()
}

function onDecrementClick() {
  if (isDecrementDisabled.value) {
    return
  }
  decrement()
  focusSpinbutton()
}

const dispatchKeydown = useKeydownActions({
  up: () => increment(),
  down: () => decrement(),
  home: () => setQuantity(minQuantity),
  end: () => setQuantity(maxQuantity),
})

function onKeydown(event: KeyboardEvent) {
  if (isControlDisabled.value) {
    return
  }
  dispatchKeydown(event)
}
</script>
