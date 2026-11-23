<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <SFCheckboxBase
        :id="id"
        v-model="model"
        :value="item"
        :disabled="disabled"
        :invalid="invalid || !!errorText"
        :aria-describedby="describedBy"
        :size="size"
        test-id="form-checkbox"
        @change="$emit('change')"
      />
      <label
        v-if="$slots.label || label"
        :for="id"
        :class="[
          !$slots.label && [
            'text-md leading-none font-semibold',
            labelTextClass,
          ],
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ]"
      >
        <slot name="label">{{ label }}</slot>
      </label>
    </div>
    <span class="flex min-w-0 flex-1 flex-col gap-2">
      <span
        v-if="visibleChannel === 'helper'"
        :id="helperId"
        class="disclaimer"
        :class="{ 'text-disabled': disabled }"
      >
        {{ helperText }}
      </span>
      <span
        v-if="visibleChannel === 'info'"
        :id="infoId"
        class="ml-1 flex items-start gap-2 disclaimer"
        :class="{ 'text-disabled': disabled }"
      >
        <IconNotifyInfo
          class="mt-0.5 size-3 shrink-0 fill-secondary"
          :class="{ 'fill-disabled': disabled }"
          aria-hidden="true"
        />
        {{ infoText }}
      </span>
      <span
        v-if="visibleChannel === 'error'"
        :id="errorId"
        role="status"
        class="ml-1 text-sm font-normal text-alert"
      >
        {{ errorText }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, useId } from 'vue'
import IconNotifyInfo from '@assets/icons/notify/info.svg'
import { useFormFieldFeedback } from '@client/composables/useFormFieldFeedback'
import SFCheckboxBase from './SFCheckboxBase.vue'

const {
  id,
  label,
  item,
  disabled = false,
  invalid = false,
  helperText,
  infoText,
  errorText,
  size = 'md',
} = defineProps<{
  /** Unique identifier for the checkbox input. Required for accessibility and form handling. */
  id: string
  /** The value associated with this checkbox when used in multiple selection mode. */
  item?: T
  /** Text label displayed next to the checkbox. Can also be provided via the label slot. */
  label?: string
  /** When true, the checkbox cannot be toggled. */
  disabled?: boolean
  /** When true, shows invalid styling on the control and label message area. */
  invalid?: boolean
  /** Helper text shown below the label. */
  helperText?: string
  /** Info message with icon shown below the label. Hidden when `errorText` is set. */
  infoText?: string
  /** Error message with alert icon. Takes precedence over helper and info text. */
  errorText?: string
  /** Checkbox control size. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg'
}>()

defineEmits<{
  /** Emitted when the checked state changes. Used by filter lists and legacy handlers. */
  change: []
}>()

const model = defineModel<T[] | boolean>()

const uid = useId()
const helperId = `checkbox-helper-${uid}`
const infoId = `checkbox-info-${uid}`
const errorId = `checkbox-error-${uid}`

const { visibleChannel, describedBy } = useFormFieldFeedback({
  error: { active: () => Boolean(errorText), id: errorId },
  info: { active: () => Boolean(infoText), id: infoId },
  helper: { active: () => Boolean(helperText), id: helperId },
})

const isChecked = computed(() => {
  if (typeof model.value === 'boolean') {
    return model.value
  }

  if (!item) {
    return false
  }

  return Array.isArray(model.value) && model.value.includes(item)
})

const labelTextClass = computed(() => {
  if (disabled) {
    return 'text-disabled'
  }
  if (invalid || errorText) {
    return 'text-alert'
  }
  if (isChecked.value) {
    return 'text-primary'
  }
  return 'text-secondary'
})
</script>
