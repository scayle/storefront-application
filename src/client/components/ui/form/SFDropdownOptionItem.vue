<!-- eslint-disable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/interactive-supports-focus -- Options are not focusable by design. The combobox trigger keeps DOM focus and the keyboard picks options through `aria-activedescendant` -->
<template>
  <li
    role="option"
    :aria-selected="selected"
    :aria-disabled="disabled || undefined"
    class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 transition-colors"
    :class="[sizeClass, stateClass, disabled && 'cursor-not-allowed!']"
    @mousedown.prevent
    @click="onSelect"
  >
    <span v-if="hasLeading" class="flex shrink-0 items-center justify-center">
      <slot name="leading">
        <SFRadioBase
          v-if="type === DropdownOptionType.LEADING_RADIO"
          decorative
          size="sm"
          :checked="selected"
          :disabled="disabled"
        />
      </slot>
    </span>

    <span
      class="flex-1 truncate text-left"
      :class="[
        labelClass,
        selected && !disabled ? 'font-semibold text-primary' : 'font-normal',
      ]"
    >
      <slot />
    </span>

    <span
      v-if="hasTrailing"
      class="flex shrink-0 items-center gap-2"
      :class="trailingClass"
    >
      <slot name="trailing" />
    </span>
  </li>
</template>
<!-- eslint-enable vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/interactive-supports-focus -->

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { DropdownOptionSize, DropdownOptionType } from '@client/utils/constants'
import SFRadioBase from './SFRadioBase.vue'

const {
  type = DropdownOptionType.DEFAULT,
  size = DropdownOptionSize.SM,
  selected = false,
  active = false,
  disabled = false,
} = defineProps<{
  /** Visual type of the option. Drives leading/trailing affordances. */
  type?: DropdownOptionType
  /** Item size. Figma defines Small and Large only. */
  size?: DropdownOptionSize
  /** True when this option is the currently selected value. */
  selected?: boolean
  /**
   * True when this option is the active descendant of the combobox (keyboard
   * highlight). DOM focus stays on the combobox; this drives the visual
   * highlight only.
   */
  active?: boolean
  /** Disables interaction and applies muted styling. */
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const slots = useSlots()

const hasLeading = computed(
  () => type === DropdownOptionType.LEADING_RADIO || !!slots.leading,
)

const hasTrailing = computed(
  () => type === DropdownOptionType.TRAILING_ICON || !!slots.trailing,
)

const sizeClass = computed(() =>
  size === DropdownOptionSize.LG ? 'h-11' : 'h-9',
)

const stateClass = computed(() => {
  if (disabled) {
    return 'text-gray-500'
  }
  if (selected) {
    return active ? 'bg-gray-300 text-primary' : 'bg-gray-200 text-primary'
  }
  if (active) {
    return 'bg-gray-200 text-primary'
  }
  return 'text-secondary hover:bg-gray-200 hover:text-primary'
})

const labelClass = computed(() =>
  size === DropdownOptionSize.LG ? 'text-md' : 'text-sm',
)

const trailingClass = computed(() =>
  selected && !disabled ? 'text-primary' : 'text-secondary',
)

const onSelect = () => {
  if (disabled) {
    return
  }
  emit('select')
}
</script>
