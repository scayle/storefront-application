<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center"
    :class="size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'"
  >
    <input
      :id="id"
      v-model="model"
      :value="value"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="invalid || undefined"
      :aria-disabled="disabled || undefined"
      class="peer cursor-pointer appearance-none rounded-md border border-solid border-gray-500 bg-transparent checked:border checked:border-solid checked:border-accent checked:bg-accent hover:border-accent hover:checked:border-accent focus-visible:border-accent checked:focus-visible:border-2 checked:focus-visible:border-focus aria-disabled:cursor-not-allowed aria-disabled:border-disabled! aria-disabled:bg-disabled-background! checked:aria-disabled:border-disabled checked:aria-disabled:bg-disabled aria-invalid:border-alert checked:aria-invalid:border-alert"
      type="checkbox"
      :data-testid="testId"
      :class="size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'"
      @click="onClick"
      @change="onChange"
    />
    <IconCheckmarkDefault
      class="pointer-events-none absolute z-1 fill-white opacity-0 peer-checked:opacity-100 peer-aria-disabled:fill-disabled"
      :class="size === 'sm' ? 'size-2' : size === 'lg' ? 'size-4' : 'size-3'"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts" generic="T">
import IconCheckmarkDefault from '@assets/icons/checkmark/default.svg'

const {
  id,
  value,
  disabled = false,
  invalid = false,
  ariaDescribedby,
  testId = 'form-checkbox-base',
  size = 'md',
} = defineProps<{
  /** Unique identifier for the checkbox input. Required for label association and forms. */
  id: string
  /** Value submitted when this checkbox is checked in a group. Omit for standalone boolean checkboxes. */
  value?: T
  /** When true, the control cannot be toggled. */
  disabled?: boolean
  /** When true, applies invalid border styling and sets `aria-invalid`. */
  invalid?: boolean
  /** IDs of helper, info, or error elements for `aria-describedby`. */
  ariaDescribedby?: string
  /** Value for `data-testid` on the native input. Defaults to `form-checkbox-base`. */
  testId?: string
  /** Size of the checkbox. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg'
}>()

const model = defineModel<T[] | boolean>()

const emit = defineEmits<{
  /** Emitted when the checked state changes. */
  change: []
}>()

// Honor `aria-disabled` semantically: the control stays focusable (no native
// `disabled` attribute, so the tab order is preserved and the user can still
// land on it), but click/change short-circuit so the model never updates.
const onClick = (event: MouseEvent) => {
  if (disabled) {
    event.preventDefault()
  }
}

const onChange = () => {
  if (disabled) {
    return
  }
  emit('change')
}
</script>
