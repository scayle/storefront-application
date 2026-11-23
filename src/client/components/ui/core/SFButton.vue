<template>
  <component
    :is="rootComponent"
    :class="[
      sizeClasses,
      variantClasses,
      roundingClasses,
      {
        'group inline-flex max-w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap transition duration-100 ease-linear focus-visible:focus-style disabled:border disabled:border-gray-400 disabled:bg-gray-300 disabled:text-gray-500 aria-disabled:border aria-disabled:border-gray-400 aria-disabled:bg-gray-300 aria-disabled:text-gray-500':
          !isRaw,
        'w-full': isFullWidth,
        'cursor-not-allowed': isDisabled,
      },
    ]"
    v-bind="rootBindings"
    @click="onClick"
  >
    <span
      v-if="hasPrependIcon"
      class="inline-flex shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-full"
      :class="iconShellClasses"
    >
      <slot v-if="$slots['prepend-icon']" name="prepend-icon" />
    </span>
    <span
      v-if="$slots.default"
      class="inline-flex min-w-0 items-center justify-center truncate"
      :class="{ 'w-full': isFullWidth }"
    >
      <slot />
    </span>
    <span
      v-if="$slots['append-icon']"
      class="inline-flex shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-full"
      :class="iconShellClasses"
    >
      <slot name="append-icon" />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import { ButtonVariant, Size } from '@client/utils/constants'
import SFLink from '@client/components/ui/links/SFLink.vue'

defineOptions({ inheritAttrs: false })

const slots = useSlots()
const attrs = useAttrs()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const {
  variant = ButtonVariant.PRIMARY,
  size: currentSize = Size.MD,
  isFullWidth = false,
  loading = false,
  disabled = false,
  roundedLeft = false,
  roundedRight = false,
  type = 'button',
  to,
  target = '_self',
} = defineProps<{
  /**
   * Determines the visual style and emphasis of the button. Primary is used for main actions, while other variants provide different levels of emphasis.
   */
  variant?: ButtonVariant
  /**
   * Controls the button's dimensions and padding.
   */
  size?: Size
  /**
   * When set, renders as an `SFLink` with `raw` so button tokens apply without link typography.
   */
  to?: string
  /**
   * Target for link mode (`to` set). Defaults to `_self`.
   */
  target?: '_self' | '_blank' | '_parent' | '_top'
  /**
   * Whether the button is full width.
   */
  isFullWidth?: boolean
  /**
   * Loading placeholder state (skeleton style). Disables interaction while keeping label and icons visible.
   */
  loading?: boolean
  /**
   * Disables the button without the loading placeholder style.
   */
  disabled?: boolean
  /**
   * Applies `rounded-l-full` on the left; the right keeps size-based default radius. Ignored when `variant` is `raw`.
   */
  roundedLeft?: boolean
  /**
   * Applies `rounded-r-full` on the right; the left keeps size-based default radius. Ignored when `variant` is `raw`.
   */
  roundedRight?: boolean
  /**
   * The type of the native button. Not used when `to` is set.
   */
  type?: HTMLButtonElement['type']
}>()

const isPrimary = computed(() => variant === ButtonVariant.PRIMARY)
const isSecondary = computed(() => variant === ButtonVariant.SECONDARY)
const isPlain = computed(() => variant === ButtonVariant.PLAIN)
const isRaw = computed(() => variant === ButtonVariant.RAW)
const isAccent = computed(() => variant === ButtonVariant.ACCENT)

const isIconOnly = computed(() => !slots.default)
const hasPrependIcon = computed(() => Boolean(slots['prepend-icon']))

/**
 * Computes the disabled state of the button based on `disabled`, `loading`, and `aria-disabled` attributes.
 *
 * - Returns `true` if the button is disabled, loading, or has `aria-disabled` set to `true` in attributes.
 * - Used to control button interactivity and to appropriately set accessibility attributes.
 * - When disabled, the button will have `aria-disabled="true"` and be non-interactive.
 * - When loading, the button will have `aria-busy="true"` and be non-interactive.
 */
const isDisabled = computed(() => {
  return disabled || loading || attrs['aria-disabled'] === true
})

const rootComponent = computed(() => (to ? SFLink : 'button'))

const rootBindings = computed(() => {
  const passthrough = { ...attrs }

  if (to) {
    return {
      ...passthrough,
      to,
      target,
      raw: true,
      tabindex: isDisabled.value ? -1 : passthrough.tabindex,
      'aria-busy': loading || passthrough['aria-busy'],
      'aria-disabled': isDisabled.value || undefined,
    }
  }

  return {
    ...passthrough,
    disabled: isDisabled.value,
    tabindex: isDisabled.value ? -1 : (passthrough.tabindex ?? 0),
    'aria-busy': loading || passthrough['aria-busy'],
    'aria-disabled': isDisabled.value || undefined,
    type,
  }
})

const onClick = (event: MouseEvent) => {
  if (isDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}

const isSize = (size?: Size): boolean => size === currentSize

/**
 * Font size per button size. `xl` (hero CTAs like "Add to basket" / checkout)
 * uses `text-lg`; its 20px line-height also drives the icon-shell `size-[1lh]`.
 */
const TYPOGRAPHY_BY_SIZE = {
  [Size.SM]: 'text-sm',
  [Size.MD]: 'text-md',
  [Size.LG]: 'text-md',
  [Size.XL]: 'text-lg',
} as const satisfies Record<Size, string>

const iconShellClasses = computed(() => {
  if (!isRaw.value) {
    return 'size-[1lh]'
  }

  if (isSize('xl')) {
    return 'size-5'
  }
  if (isSize('lg')) {
    return 'size-4'
  }

  return 'size-3'
})

const sizeClasses = computed(() => {
  if (isRaw.value) {
    return ''
  }

  // The `sf-button-md-resting-*` utilities (see `index.css`) already carry
  // the medium size dimensions for the accent and secondary variants, so
  // `variantClasses` handles both visuals in one place. Skip emitting size
  // classes for those branches to avoid double-applied utilities.
  if (isSize('md') && (isAccent.value || isSecondary.value)) {
    return ''
  }

  const typography = TYPOGRAPHY_BY_SIZE[currentSize]

  // Small plain buttons sit below the 24px WCAG 2.5.8 minimum target, so
  // `hit-area-min` extends their pointer target instead of relying on the
  // spacing callers leave around them.
  if (isPlain.value) {
    if (isIconOnly.value) {
      return [
        {
          'size-5 rounded-sm hit-area-min': isSize('sm'),
          'size-6 rounded-md': isSize('md'),
          'size-8 rounded-md': isSize('lg'),
          'size-10 rounded-lg': isSize('xl'),
        },
        typography,
      ]
    }

    return [
      {
        'h-5 rounded-sm px-2 hit-area-min': isSize('sm'),
        'h-6 rounded-md px-2': isSize('md'),
        'h-8 rounded-md px-2': isSize('lg'),
        'h-10 rounded-lg px-2': isSize('xl'),
      },
      typography,
    ]
  }

  // Icon-only buttons are square by construction: emit a definite width
  // (`size-*`) alongside the height rather than deriving width from content.
  // This avoids callers reaching for `aspect-square`, whose `aspect-ratio` is
  // unreliable on flex items in Safari (the item keeps its content width and
  // renders as a tall pill instead of a square).
  if (isIconOnly.value) {
    return [
      {
        'size-13 rounded-xl': isSize('xl'),
        'size-12 rounded-lg': isSize('lg'),
        'size-11 rounded-lg': isSize('md'),
        'size-8 rounded-md': isSize('sm'),
      },
      'p-2',
      typography,
    ]
  }

  return [
    {
      'h-13 rounded-xl': isSize('xl'),
      'h-12 rounded-lg': isSize('lg'),
      'h-11 rounded-lg': isSize('md'),
      'h-8 rounded-md': isSize('sm'),
    },
    'px-4',
    typography,
  ]
})

const variantClasses = computed(() => {
  if (isRaw.value) {
    return ''
  }

  if (loading) {
    return `animate-pulse bg-gray-300 text-gray-500 border border-transparent font-semibold`
  }

  if (isPrimary.value) {
    return [
      'bg-primary text-white font-semibold shadow-input border border-transparent',
      'not-aria-disabled:hover:bg-accent not-aria-disabled:hover:shadow-hover',
    ].join(' ')
  }

  // For the medium-size accent and secondary variants the resting visual
  // lives in the `sf-button-md-resting-*` utilities so non-interactive
  // surfaces (e.g. a `<span aria-current="true">` rendered in place of the
  // current item in a list of links) can share the same source of truth.
  // Only the interactive-state additions are appended here.
  if (isSecondary.value) {
    const resting = isSize('md')
      ? 'sf-button-md-resting-secondary'
      : 'bg-white text-secondary font-normal border border-gray-400'
    return [
      resting,
      'not-aria-disabled:hover:bg-gray-200 not-aria-disabled:hover:text-primary',
    ].join(' ')
  }

  if (isAccent.value) {
    const resting = isSize('md')
      ? 'sf-button-md-resting-accent'
      : 'bg-accent text-white font-semibold border border-transparent'
    return [
      resting,
      'not-aria-disabled:hover:bg-accent/75 not-aria-disabled:hover:text-white',
    ].join(' ')
  }

  if (isPlain.value) {
    return [
      'bg-transparent text-secondary font-semibold border border-transparent',
      'not-aria-disabled:hover:bg-gray-200 focus:bg-gray-200 not-aria-disabled:hover:text-primary',
    ].join(' ')
  }

  return ''
})

const roundingClasses = computed(() => {
  if (isRaw.value) {
    return ''
  }

  if (roundedLeft && roundedRight) {
    return '!rounded-full'
  }
  if (roundedLeft) {
    return '!rounded-l-full'
  }
  if (roundedRight) {
    return '!rounded-r-full'
  }

  return ''
})
</script>
