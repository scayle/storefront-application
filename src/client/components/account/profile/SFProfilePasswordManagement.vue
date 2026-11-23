<template>
  <div
    class="flex flex-col items-start gap-1 rounded-xl border border-gray-400 bg-white px-4 py-5 text-secondary"
  >
    <h3 class="mb-2 heading-section-2" data-testid="profile-password-headline">
      {{ $t('account.profile.password_management.title') }}
    </h3>
    <p class="mb-6 text-md">
      {{ description }}
    </p>
    <form
      v-if="!isIDPUser"
      class="flex w-full flex-col"
      data-testid="password-update-form"
      @submit.prevent="onSubmit"
    >
      <SFErrorMessageContainer
        :message="errorMessage"
        class="mb-8"
        data-testid="password-error-message"
      />
      <!-- Hidden email field for browser password autofill -->
      <input
        type="email"
        :value="customer?.email"
        autocomplete="username"
        class="hidden"
        tabindex="-1"
        aria-hidden="true"
      />
      <SFValidatedInputGroup
        v-slot="{ isValid, errorId }"
        :errors="r$.$fields.password.$errors"
      >
        <SFPasswordInput
          ref="passwordRef"
          v-model="r$.$fields.password.$value"
          :placeholder="$t('account.form_fields.old_password')"
          :has-errors="!isValid"
          :aria-describedby="errorId"
          :readonly="isUpdating"
          autocomplete="current-password"
          required
          data-testid="current-password"
          @blur="r$.$fields.password.$touch()"
        />
      </SFValidatedInputGroup>
      <SFValidatedInputGroup
        v-slot="{ isValid, errorId }"
        :errors="r$.$fields.newPassword.$errors"
      >
        <SFPasswordInput
          ref="newPasswordRef"
          v-model="r$.$fields.newPassword.$value"
          :placeholder="$t('account.form_fields.new_password')"
          :has-errors="!isValid"
          :aria-describedby="errorId"
          autocomplete="new-password"
          required
          data-testid="new-password"
          @blur="r$.$fields.newPassword.$touch()"
        />
      </SFValidatedInputGroup>
      <SFButton
        :loading="isUpdating"
        :aria-disabled="r$.$error || isUpdating || undefined"
        data-testid="password-submit"
        type="submit"
        class="self-start"
      >
        {{ $t('global.save') }}
      </SFButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from 'vue'
import { useRegle } from '@regle/core'
import {
  required,
  minLength,
  maxLength,
  regex,
  withMessage,
} from '@regle/rules'
import { useI18n } from 'vue-i18n'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFValidatedInputGroup from '@client/components/ui/form/SFValidatedInputGroup.vue'
import SFErrorMessageContainer from '@client/components/ui/form/SFErrorMessageContainer.vue'
import { useRpcClient } from '@client/composables/useRpcClient'
import { useToast } from '@client/composables/useToast'
import { useCustomer } from '@client/composables/useCustomer'
import { useAnnouncer } from '@client/composables/useAnnouncer'
import { useInvalidSubmitFeedback } from '@client/composables/useInvalidSubmitFeedback'
import SFPasswordInput from '@client/components/ui/form/SFPasswordInput.vue'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_NO_WHITESPACE,
  PASSWORD_UPPERCASE,
  PASSWORD_LOWERCASE,
  PASSWORD_DIGIT,
  PASSWORD_SPECIAL_CHARACTER,
} from '@shared/constants/password'

const { t } = useI18n()
const rpcClient = useRpcClient()
const toast = useToast()
const { customer } = useCustomer()
const { announce } = useAnnouncer()

const isIDPUser = computed(
  () => customer.value?.authentication?.type !== 'password',
)

const description = computed(() =>
  isIDPUser.value
    ? t('account.profile.password_management.idp_description')
    : t('account.profile.password_management.description'),
)

const payload = reactive({
  password: '',
  newPassword: '',
})

const isUpdating = ref(false)
const errorMessage = ref<string | null>(null)

const passwordRef =
  useTemplateRef<InstanceType<typeof SFPasswordInput>>('passwordRef')
const newPasswordRef =
  useTemplateRef<InstanceType<typeof SFPasswordInput>>('newPasswordRef')

const passwordFields = ['password', 'newPassword'] as const
type PasswordField = (typeof passwordFields)[number]
const fieldRefs: Record<PasswordField, typeof passwordRef> = {
  password: passwordRef,
  newPassword: newPasswordRef,
}

const { r$ } = useRegle(payload, {
  password: {
    required: withMessage(
      required,
      t('account.validation.required', {
        field: t('account.form_fields.old_password'),
      }),
    ),
  },
  newPassword: {
    required: withMessage(
      required,
      t('account.validation.required', {
        field: t('account.form_fields.new_password'),
      }),
    ),
    minLength: withMessage(
      minLength(PASSWORD_MIN_LENGTH),
      t('account.validation.password'),
    ),
    maxLength: withMessage(
      maxLength(PASSWORD_MAX_LENGTH),
      t('account.validation.password'),
    ),
    noWhitespace: withMessage(
      regex(PASSWORD_NO_WHITESPACE),
      t('account.validation.password'),
    ),
    uppercase: withMessage(
      regex(PASSWORD_UPPERCASE),
      t('account.validation.password'),
    ),
    containsLowercase: withMessage(
      regex(PASSWORD_LOWERCASE),
      t('account.validation.password'),
    ),
    containsNumber: withMessage(
      regex(PASSWORD_DIGIT),
      t('account.validation.password'),
    ),
    specialCharacter: withMessage(
      regex(PASSWORD_SPECIAL_CHARACTER),
      t('account.validation.password'),
    ),
  },
})

const errorMessageForStatus: Record<string, string> = {
  BAD_REQUEST: t('account.profile.password_management.error.400_bad_request'),
  FORBIDDEN: t('account.profile.password_management.error.wrong_password'),
}

const { reportInvalidSubmit } = useInvalidSubmitFeedback({
  fields: passwordFields,
  hasError: (field) => Boolean(r$.$fields[field].$errors?.length),
  focus: (field) => fieldRefs[field].value?.focus(),
})

const onSubmit = async () => {
  // Honor the `aria-disabled` in-flight state — the button stays focusable so
  // the user may re-trigger; we guard the handler instead.
  if (isUpdating.value) {
    return
  }

  const { valid } = await r$.$validate()
  if (!valid) {
    reportInvalidSubmit()
    return
  }

  isUpdating.value = true
  errorMessage.value = null

  announce(t('account.profile.saving'))

  const { error, isDefined } = await rpcClient.profile.updatePassword({
    password: payload.password,
    newPassword: payload.newPassword,
  })

  if (error) {
    errorMessage.value =
      (isDefined ? errorMessageForStatus[error.code] : undefined) ??
      t('account.profile.password_management.error.400_bad_request')
    isUpdating.value = false
    return
  }

  toast.show(t('account.profile.password_management.success_message'), {
    type: 'SUCCESS',
  })

  payload.password = ''
  payload.newPassword = ''
  r$.$reset()
  isUpdating.value = false
}
</script>
