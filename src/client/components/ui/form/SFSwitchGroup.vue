<template>
  <fieldset
    class="flex flex-col gap-2"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
  >
    <legend
      v-if="legend"
      class="mb-3 text-md font-semibold"
      :class="legendColor"
    >
      {{ legend }}
    </legend>
    <div class="flex flex-col gap-3">
      <slot />
    </div>
    <span
      v-if="helperText"
      class="pl-px text-sm font-normal"
      :class="helperColor"
    >
      {{ helperText }}
    </span>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, provide, toRef } from 'vue'
import { SFSwitchGroupDisabledKey } from './switchGroupKey'

const {
  disabled = false,
  legend,
  helperText,
} = defineProps<{
  /** Visible legend rendered above the group. Use `ariaLabel` instead when no visible heading is desired. */
  legend?: string
  /** Shared helper message rendered below the group. */
  helperText?: string
  /** When true, every descendant `SFSwitch` is disabled regardless of its own prop. */
  disabled?: boolean
}>()

provide(
  SFSwitchGroupDisabledKey,
  toRef(() => disabled),
)

const legendColor = computed(() =>
  disabled ? 'text-disabled' : 'text-primary',
)
const helperColor = computed(() =>
  disabled ? 'text-disabled' : 'text-secondary',
)
</script>
