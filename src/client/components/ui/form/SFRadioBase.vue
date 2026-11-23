<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center"
    :class="wrapperSizeClass"
  >
    <template v-if="decorative">
      <span
        aria-hidden="true"
        class="inline-flex appearance-none rounded-full border border-solid"
        :class="[wrapperSizeClass, decorativeClass]"
      />
      <span
        v-if="checked && !disabled"
        class="pointer-events-none absolute rounded-full bg-white"
        :class="dotSizeClass"
        aria-hidden="true"
      />
    </template>
    <template v-else>
      <input
        :id="id"
        v-model="model"
        :value="value"
        :name="name"
        :disabled="disabled"
        :aria-describedby="ariaDescribedby"
        :aria-invalid="invalid || undefined"
        :aria-disabled="disabled || undefined"
        class="peer cursor-pointer appearance-none rounded-full border border-solid border-gray-500 bg-transparent checked:border-accent checked:bg-accent hover:border-accent disabled:cursor-not-allowed disabled:border-gray-300! disabled:bg-gray-100! aria-invalid:border-alert checked:aria-invalid:border-alert"
        type="radio"
        :data-testid="testId"
        :class="wrapperSizeClass"
        @change="$emit('change')"
      />
      <span
        class="pointer-events-none absolute rounded-full bg-white opacity-0 peer-checked:opacity-100 peer-disabled:bg-gray-500"
        :class="dotSizeClass"
        aria-hidden="true"
      />
    </template>
  </span>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue'

const {
  id,
  value,
  name,
  disabled = false,
  invalid = false,
  ariaDescribedby,
  testId = 'form-radio-base',
  size = 'md',
  decorative = false,
  checked = false,
} = defineProps<{
  /** Unique identifier for the radio input. Provide for label association and forms in interactive mode; unused in `decorative` mode. */
  id?: string
  /** Value submitted when this radio is selected within a group. */
  value?: T
  /** Shared `name` grouping radios so only one can be selected at a time. */
  name?: string
  /** When true, the control cannot be selected. */
  disabled?: boolean
  /** When true, applies invalid border styling and sets `aria-invalid`. */
  invalid?: boolean
  /** IDs of helper, info, warning, or error elements for `aria-describedby`. */
  ariaDescribedby?: string
  /** Value for `data-testid` on the native input. Defaults to `form-radio-base`. */
  testId?: string
  /** Size of the radio. Defaults to `md` (the size defined in the design system). */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Renders the radio as a non-interactive visual only (no native input, no
   * focus, no v-model). Use when an enclosing control owns selection — e.g. a
   * dropdown option `<li role="option">` that drives its own selected state.
   * The checked appearance is then driven by `checked`, not the model.
   */
  decorative?: boolean
  /** Checked appearance in `decorative` mode. Ignored in interactive mode (the model decides). */
  checked?: boolean
}>()

const model = defineModel<T>()

defineEmits<{
  /** Emitted when the selected state changes. */
  change: []
}>()

const WRAPPER_SIZE_CLASS = { sm: 'size-4', md: 'size-5', lg: 'size-6' } as const
const DOT_SIZE_CLASS = { sm: 'size-1', md: 'size-1.5', lg: 'size-2' } as const

const wrapperSizeClass = computed(() => WRAPPER_SIZE_CLASS[size])
const dotSizeClass = computed(() => DOT_SIZE_CLASS[size])

const decorativeClass = computed(() => {
  if (disabled) {
    return 'border-gray-300 bg-gray-100'
  }
  if (invalid) {
    return 'border-alert bg-transparent'
  }
  if (checked) {
    return 'border-accent bg-accent'
  }
  return 'border-gray-500 bg-transparent'
})
</script>
