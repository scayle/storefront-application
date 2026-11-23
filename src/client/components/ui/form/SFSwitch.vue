<template>
  <div class="flex flex-col gap-2">
    <div
      class="flex items-center gap-3"
      :class="
        resolvedDisabled
          ? 'cursor-not-allowed'
          : label || $slots.label
            ? 'cursor-pointer'
            : ''
      "
    >
      <slot name="thumb" :is-active="model" @toggle="toggle">
        <SFSwitchBase
          :id="id"
          v-model="model"
          :disabled="disabled"
          :aria-describedby="describedBy"
          :aria-label="hasVisibleLabel ? undefined : ariaLabel"
          :aria-labelledby="hasVisibleLabel ? labelId : undefined"
          :test-id="testId"
        />
      </slot>
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- Clicking the label text is a pointer shortcut. The switch button next to it is the keyboard target. -->
      <span
        v-if="hasVisibleLabel"
        :id="labelId"
        class="text-md font-semibold"
        :class="labelColor"
        @click="toggle"
      >
        <slot name="label">{{ label }}</slot>
      </span>
    </div>
    <span
      v-if="helperText"
      :id="helperId"
      class="pl-px text-sm font-normal"
      :class="helperColor"
    >
      {{ helperText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, useId, useSlots } from 'vue'
import SFSwitchBase from './SFSwitchBase.vue'
import { SFSwitchGroupDisabledKey } from './switchGroupKey'

const {
  id,
  label,
  helperText,
  disabled = false,
  ariaLabel,
  testId = 'form-switch',
} = defineProps<{
  /** Unique identifier for the switch. Required for accessibility and form handling. */
  id: string
  /** Text label rendered next to the switch. Can be replaced via the `label` slot. */
  label?: string
  /** Helper message rendered below the switch. Linked via `aria-describedby`. */
  helperText?: string
  /** When true, the switch is disabled. A parent `SFSwitchGroup` with `disabled` set always wins. */
  disabled?: boolean
  /** Accessible label forwarded to the base control when no visible `label` is provided. */
  ariaLabel?: string
  /** Value for `data-testid` on the base control. Defaults to `form-switch`. */
  testId?: string
}>()

const model = defineModel<boolean>({ default: false })

const groupDisabled = inject(SFSwitchGroupDisabledKey, null)
const resolvedDisabled = computed(() => groupDisabled?.value || disabled)

const slots = useSlots()

const uid = useId()
const helperId = `switch-helper-${uid}`
const labelId = `switch-label-${uid}`

const hasVisibleLabel = computed(() => Boolean(label || slots.label))
const describedBy = computed(() => (helperText ? helperId : undefined))

const labelColor = computed(() => {
  if (resolvedDisabled.value) {
    return 'text-disabled'
  }
  return model.value ? 'text-primary' : 'text-secondary'
})

const helperColor = computed(() =>
  resolvedDisabled.value ? 'text-disabled' : 'text-secondary',
)

const toggle = () => {
  if (resolvedDisabled.value) {
    return
  }
  model.value = !model.value
}
</script>
