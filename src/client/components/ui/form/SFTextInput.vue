<template>
  <div class="flex w-full flex-col">
    <div
      :class="[
        'group/text-input relative flex h-11 w-full items-stretch rounded-lg transition duration-100',
        {
          'focus-within:focus-style': !disabled,
          [FIELD_FOCUS_CLASSES]: isFieldInteractive,
          'cursor-not-allowed border border-disabled-border bg-disabled-background text-disabled':
            disabled,
          'border border-alert! bg-white': !disabled && hasErrors,
          'border border-gray-300 bg-white':
            !disabled && !hasErrors && readonly,
          'border border-gray-400 bg-white': Boolean(modelValue) && !disabled,
          'border-gray-300 bg-gray-200 hover:bg-gray-300':
            isFieldInteractive && !shouldForceDock,
        },
      ]"
    >
      <div
        v-if="$slots['leading-icon']"
        class="flex shrink-0 items-center pl-5 [&_svg]:size-4"
        :class="iconColorClasses"
      >
        <slot name="leading-icon" />
      </div>

      <!--
        The focus ring is drawn around the whole field, icons included, so the
        input cancels its own. A readonly input still takes focus, which is why
        the ring sits outside FIELD_FOCUS_CLASSES. A disabled field skips it,
        since only its trailing content can take focus and rings itself.
      -->
      <input
        v-bind="$attrs"
        :id="inputId"
        ref="input"
        v-model="modelValue"
        :name="name"
        :type="type"
        :required="required"
        :readonly="readonly"
        :disabled="disabled"
        :aria-required="required || undefined"
        :aria-invalid="hasErrors || undefined"
        :aria-disabled="disabled || undefined"
        :aria-describedby="describedBy"
        :placeholder="floatingLabel ? ' ' : (placeholder ?? undefined)"
        class="peer min-w-0 flex-1 appearance-none rounded-lg bg-transparent text-lg text-primary shadow-none ring-0 transition-colors duration-100 input-white-autofill outline-none disabled:cursor-not-allowed disabled:text-disabled"
        :class="[
          floatingLabel
            ? 'placeholder:text-transparent'
            : 'placeholder:text-secondary',
          $slots['leading-icon'] ? 'pl-2' : 'pl-5',
          hasTrailingContent ? 'pr-2' : 'pr-3',
        ]"
      />

      <label
        v-if="floatingLabel"
        :for="inputId"
        class="pointer-events-none absolute z-10 origin-left -translate-y-1/2 truncate text-secondary transition-all duration-100 ease-out peer-placeholder-shown:text-md peer-disabled:text-disabled"
        :class="[
          shouldForceDock ? LABEL_DOCKED_CLASSES : LABEL_FLOATING_CLASSES,
          hasLeadingIcon
            ? 'left-4 peer-placeholder-shown:left-11 peer-focus:left-4'
            : 'left-4 peer-placeholder-shown:left-4',
          labelColorClasses,
          {
            'after:ml-0.5 after:text-secondary after:content-[\'*\']': required,
            'text-alert!': hasErrors,
          },
        ]"
      >
        {{ placeholder }}
        <!--
          Required indicator in the label (WCAG H90, a11y-style-guide):
          the visual `::after` `*` for sighted users plus an sr-only text
          suffix so the cue lands in the accessible name and is read during
          browse mode / heading scans, not only after focus. This sits next
          to the programmatic state on the input (`:required` + the
          redundant `aria-required` we keep for AT-fallback breadth); the
          two layers complement each other rather than duplicating the same
          announcement event.
        -->
        <span v-if="required" class="sr-only">
          ({{ $t('global.required') }})
        </span>
      </label>

      <div
        v-if="hasTrailingContent"
        class="z-10 flex h-full shrink-0 items-center gap-1 p-1 pr-2 [&_button]:size-10 [&_button]:shrink-0 [&_svg]:size-4"
      >
        <slot name="trailing" />
      </div>
    </div>

    <p
      v-if="visibleChannel === 'helper'"
      :id="helperId"
      class="mt-2 ml-1 disclaimer"
    >
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, useId, useSlots, useTemplateRef } from 'vue'
import { useFormFieldFeedback } from '@client/composables/useFormFieldFeedback'

defineOptions({ inheritAttrs: false })

const FIELD_FOCUS_CLASSES =
  'focus-within:border focus-within:border-accent focus-within:bg-white group-focus-within/text-input:hover:border-accent group-focus-within/text-input:hover:bg-white'

const LABEL_DOCKED_CLASSES = 'top-0 bg-white px-1 text-sm'

const LABEL_FLOATING_CLASSES =
  'top-0 bg-white px-1 text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:top-0 peer-focus:bg-white peer-focus:px-1 peer-focus:text-sm'

const {
  required = false,
  hasErrors = false,
  placeholder,
  readonly = false,
  disabled = false,
  type = 'text',
  name,
  helperText,
} = defineProps<{
  /**
   * Label text that doubles as placeholder when the field is empty and
   * floats above the input when focused or filled.
   */
  placeholder: string
  /** Marks the field as required and shows the visual asterisk. */
  required?: boolean
  /** Native input type. Defaults to `text`. */
  type?: HTMLInputElement['type']
  /** Renders the field read-only without the disabled treatment. */
  readonly?: boolean
  /** Disables interaction and applies the disabled visual state. */
  disabled?: boolean
  /**
   * Applies the error visual state and exposes `aria-invalid`.
   */
  hasErrors?: boolean
  /**
   * Helper text shown below the input. Hidden while `hasErrors` is true
   */
  helperText?: string
  /** Native input `name` attribute. */
  name?: string
}>()

const modelValue = defineModel<string>({ default: '' })

const attrs = useAttrs()
const slots = useSlots()

const input = useTemplateRef<HTMLInputElement>('input')

const inputId = `text-input-${useId()}`
const helperId = `${inputId}-message`

const floatingLabel = computed(() => Boolean(placeholder))

const { visibleChannel, describedBy } = useFormFieldFeedback(
  {
    error: { active: () => hasErrors },
    helper: { active: () => Boolean(helperText), id: helperId },
  },
  () => attrs['aria-describedby'] as string | undefined,
)

const shouldForceDock = computed(() => Boolean(modelValue.value))

const hasLeadingIcon = computed(() => Boolean(slots['leading-icon']))

const hasTrailingContent = computed(() => Boolean(slots.trailing))

const isFieldInteractive = computed(() => !disabled && !readonly)

const labelColorClasses = computed(() => {
  if (disabled) {
    return 'text-disabled'
  }
  if (hasErrors) {
    return 'text-alert peer-focus:text-alert'
  }
  return 'text-secondary peer-focus:text-secondary'
})

const iconColorClasses = computed(() => {
  if (disabled) {
    return 'text-disabled'
  }
  if (hasErrors) {
    return 'text-alert'
  }
  return modelValue.value ? 'text-primary' : 'text-secondary'
})

const focus = () => {
  input.value?.focus()
}

defineExpose({ focus })
</script>
