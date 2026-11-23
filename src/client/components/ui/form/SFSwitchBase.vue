<template>
  <button
    :id="id"
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-disabled="resolvedDisabled || undefined"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :aria-describedby="ariaDescribedby"
    :data-testid="testId"
    :class="trackClass"
    class="relative inline-flex h-6 w-10 shrink-0 items-center rounded-xl p-1 transition-colors duration-200 ease-in-out aria-disabled:cursor-not-allowed"
    @click="toggle"
  >
    <span
      class="size-4 shrink-0 rounded-xl transition-all duration-200 ease-in-out"
      :class="thumbClass"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { SFSwitchGroupDisabledKey } from './switchGroupKey'

const {
  id,
  disabled = false,
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  testId = 'form-switch-base',
} = defineProps<{
  /** Unique identifier for the switch control. Required for label association. */
  id: string
  /** When true, the switch cannot be toggled. A disabled `SFSwitchGroup` disables the switch even when this is false. */
  disabled?: boolean
  /** Accessible label when no visible label is provided. Mutually exclusive with `aria-labelledby`. */
  ariaLabel?: string
  /** ID of a visible label element. Preferred over `aria-label` when a visible label exists. */
  ariaLabelledby?: string
  /** IDs of helper or error elements linked via `aria-describedby`. */
  ariaDescribedby?: string
  /** Value for `data-testid` on the control. Defaults to `form-switch-base`. */
  testId?: string
}>()

const model = defineModel<boolean>({ default: false })

const groupDisabled = inject(SFSwitchGroupDisabledKey, null)

const resolvedDisabled = computed(() => groupDisabled?.value || disabled)

const trackClass = computed(() => {
  if (resolvedDisabled.value) {
    return 'bg-gray-100! border-1 border-gray-300'
  }
  if (model.value) {
    return 'bg-accent hover:bg-accent/75'
  }
  return 'bg-gray-400 hover:bg-gray-500'
})

const thumbClass = computed(() => {
  const color = resolvedDisabled.value ? 'bg-gray-300' : 'bg-white'
  const position = model.value ? 'translate-x-4' : 'translate-x-0'
  return `${color} ${position}`
})

const toggle = () => {
  if (resolvedDisabled.value) {
    return
  }
  model.value = !model.value
}
</script>
