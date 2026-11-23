<template>
  <SFTextInput
    ref="textInput"
    v-bind="$attrs"
    v-model="modelValue"
    :placeholder="placeholder"
    :required="required"
    :readonly="readonly"
    :disabled="disabled"
    :has-errors="hasErrors"
    :helper-text="helperText"
    :name="name"
    :type="passwordInputType"
  >
    <template #trailing>
      <slot name="trailing-link" />
      <button
        type="button"
        :aria-label="
          isPasswordHidden
            ? $t('text_input.password.show')
            : $t('text_input.password.hide')
        "
        :aria-pressed="!isPasswordHidden"
        :data-testid="
          isPasswordHidden ? 'password-toggle-show' : 'password-toggle-hide'
        "
        class="flex size-full items-center justify-center rounded-md text-secondary transition-colors hover:text-primary"
        @click.prevent="togglePasswordVisibility"
      >
        <IconInputShowPassword v-if="isPasswordHidden" aria-hidden="true" />
        <IconInputHidePassword v-else aria-hidden="true" />
      </button>
    </template>
  </SFTextInput>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import IconInputHidePassword from '@assets/icons/input/hide-password.svg'
import IconInputShowPassword from '@assets/icons/input/show-password.svg'
import SFTextInput from './SFTextInput.vue'

defineOptions({ inheritAttrs: false })

/** The password, bound with `v-model`. */
const modelValue = defineModel<string>({ default: '' })

const {
  required = false,
  hasErrors = false,
  placeholder,
  readonly = false,
  disabled = false,
  name,
  helperText,
} = defineProps<{
  /** Label text shown as the floating placeholder. */
  placeholder: string
  /** Marks the field as required and shows the visual asterisk. */
  required?: boolean
  /** Renders the field read-only without the disabled treatment. */
  readonly?: boolean
  /** Disables interaction and applies the disabled visual state. */
  disabled?: boolean
  /** Applies the error visual state and exposes `aria-invalid`. */
  hasErrors?: boolean
  /** Helper text shown below the input. Hidden while `hasErrors` is true. */
  helperText?: string
  /** Native input `name` attribute. */
  name?: string
}>()

const passwordHidden = ref(true)

const isPasswordHidden = computed(() => passwordHidden.value)

const passwordInputType = computed<'password' | 'text'>(() =>
  passwordHidden.value ? 'password' : 'text',
)

const togglePasswordVisibility = () => {
  passwordHidden.value = !passwordHidden.value
}

const textInput = useTemplateRef<InstanceType<typeof SFTextInput>>('textInput')

defineExpose({
  focus: () => textInput.value?.focus(),
})
</script>
