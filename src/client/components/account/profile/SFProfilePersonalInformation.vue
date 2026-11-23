<template>
  <div
    class="flex flex-col items-start gap-1 rounded-xl border border-gray-400 bg-white px-4 py-5 text-secondary"
  >
    <h3
      class="mb-2 heading-section-2"
      data-testid="profile-personal-information-headline"
    >
      {{ $t('account.profile.personal_information.title') }}
    </h3>
    <p class="mb-6 text-md">
      {{ $t('account.profile.personal_information.description') }}
    </p>
    <form
      class="flex w-full flex-col"
      data-testid="personal-info-form"
      @submit.prevent="onSubmit"
    >
      <SFValidatedInputGroup
        v-slot="{ isValid, errorId }"
        :errors="r$.$fields.gender.$errors"
      >
        <SFGenderSelection
          ref="genderRef"
          v-model="r$.$fields.gender.$value"
          :disabled="isUpdating"
          :is-valid="isValid"
          :aria-describedby="errorId"
        />
      </SFValidatedInputGroup>
      <SFValidatedInputGroup
        v-slot="{ isValid, errorId }"
        :errors="r$.$fields.firstName.$errors"
      >
        <SFTextInput
          ref="firstNameRef"
          v-model="r$.$fields.firstName.$value"
          autocomplete="given-name"
          :placeholder="$t('account.form_fields.first_name')"
          :has-errors="!isValid"
          :aria-describedby="errorId"
          required
          :readonly="isUpdating"
          data-testid="user-first-name"
          @blur="r$.$fields.firstName.$touch()"
        />
      </SFValidatedInputGroup>
      <SFValidatedInputGroup
        v-slot="{ isValid, errorId }"
        :errors="r$.$fields.lastName.$errors"
      >
        <SFTextInput
          ref="lastNameRef"
          v-model="r$.$fields.lastName.$value"
          autocomplete="family-name"
          :placeholder="$t('account.form_fields.last_name')"
          :has-errors="!isValid"
          :aria-describedby="errorId"
          required
          :readonly="isUpdating"
          data-testid="user-last-name"
          @blur="r$.$fields.lastName.$touch()"
        />
      </SFValidatedInputGroup>
      <SFValidatedInputGroup
        v-slot="{ isValid, errorId }"
        :errors="r$.$fields.birthDate.$errors"
        data-testid="section-birthdate"
      >
        <SFTextInput
          ref="birthDateRef"
          v-model="r$.$fields.birthDate.$value"
          :has-errors="!isValid"
          :aria-describedby="errorId"
          :placeholder="$t('account.form_fields.birth_date')"
          :required="hasStoredBirthDate"
          type="date"
          data-testid="user-birthdate"
          @blur="r$.$fields.birthDate.$touch()"
        />
      </SFValidatedInputGroup>
      <p v-if="!hasChanged" id="personal-info-no-changes" class="sr-only">
        {{ $t('account.profile.personal_information.no_changes') }}
      </p>
      <SFButton
        :loading="isUpdating"
        :aria-disabled="r$.$error || isUpdating || !hasChanged"
        :aria-describedby="!hasChanged ? 'personal-info-no-changes' : undefined"
        data-testid="personal-info-submit"
        type="submit"
        class="self-start"
      >
        {{ $t('global.save') }}
      </SFButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, reactive, useTemplateRef } from 'vue'
import { useRegle } from '@regle/core'
import {
  dateBefore,
  dateAfter,
  required,
  requiredIf,
  withMessage,
} from '@regle/rules'
import { useI18n } from 'vue-i18n'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFTextInput from '@client/components/ui/form/SFTextInput.vue'
import SFValidatedInputGroup from '@client/components/ui/form/SFValidatedInputGroup.vue'
import { useRpcClient } from '@client/composables/useRpcClient'
import { useToast } from '@client/composables/useToast'
import { useCustomer } from '@client/composables/useCustomer'
import { useAnnouncer } from '@client/composables/useAnnouncer'
import { useInvalidSubmitFeedback } from '@client/composables/useInvalidSubmitFeedback'
import SFGenderSelection from './SFGenderSelection.vue'

const { t } = useI18n()
const rpcClient = useRpcClient()
const toast = useToast()
const { customer, reloadCustomer } = useCustomer()
const { announce } = useAnnouncer()

const initPayload = () => ({
  firstName: customer.value?.firstName ?? '',
  lastName: customer.value?.lastName ?? '',
  birthDate: customer.value?.birthDate ?? '',
  gender: customer.value?.gender,
})

const payload = reactive(initPayload())

const isUpdating = ref(false)

const genderRef =
  useTemplateRef<InstanceType<typeof SFGenderSelection>>('genderRef')
const firstNameRef =
  useTemplateRef<InstanceType<typeof SFTextInput>>('firstNameRef')
const lastNameRef =
  useTemplateRef<InstanceType<typeof SFTextInput>>('lastNameRef')
const birthDateRef =
  useTemplateRef<InstanceType<typeof SFTextInput>>('birthDateRef')

const editableFields = ['firstName', 'lastName', 'birthDate', 'gender'] as const
type EditableField = (typeof editableFields)[number]

const hasChanged = computed(() =>
  editableFields.some(
    (prop: EditableField) => payload[prop] !== (customer.value?.[prop] ?? ''),
  ),
)

// The Customer Account API cannot remove a stored birth date, only change it.
const hasStoredBirthDate = computed(() => Boolean(customer.value?.birthDate))

const { r$ } = useRegle(payload, {
  gender: {
    required: withMessage(
      required,
      t('account.validation.required', {
        field: t('account.form_fields.gender'),
      }),
    ),
  },
  firstName: {
    required: withMessage(
      required,
      t('account.validation.required', {
        field: t('account.form_fields.first_name'),
      }),
    ),
  },
  lastName: {
    required: withMessage(
      required,
      t('account.validation.required', {
        field: t('account.form_fields.last_name'),
      }),
    ),
  },
  birthDate: {
    required: withMessage(
      requiredIf(hasStoredBirthDate),
      t('account.validation.required', {
        field: t('account.form_fields.birth_date'),
      }),
    ),
    dateAfter: withMessage(
      dateAfter(new Date(1900, 0, 1)),
      t('account.validation.date', {
        field: t('account.form_fields.birth_date'),
      }),
    ),
    dateBefore: withMessage(
      dateBefore(() => new Date()),
      t('account.validation.past_date', {
        field: t('account.form_fields.birth_date'),
      }),
    ),
  },
})

// Field order here mirrors the visual order so the first-invalid lookup follows
// the user's reading direction. Each primitive exposes `focus()`.
const fieldRefs: Record<
  EditableField,
  { value: { focus: () => void } | null }
> = {
  gender: genderRef,
  firstName: firstNameRef,
  lastName: lastNameRef,
  birthDate: birthDateRef,
}

const { reportInvalidSubmit } = useInvalidSubmitFeedback({
  fields: editableFields,
  hasError: (field) => Boolean(r$.$fields[field].$errors?.length),
  focus: (field) => fieldRefs[field].value?.focus(),
})

const onSubmit = async () => {
  if (isUpdating.value || !hasChanged.value) {
    return
  }

  const { valid } = await r$.$validate()
  if (!valid) {
    reportInvalidSubmit()
    return
  }

  isUpdating.value = true

  announce(t('account.profile.saving'))

  const { error } = await rpcClient.profile.updatePersonalInfo({
    firstName: payload.firstName,
    lastName: payload.lastName,
    gender: payload.gender,
    // An empty string fails the Customer Account API date pattern, so leave the key out.
    birthDate: payload.birthDate || undefined,
  })

  if (error) {
    toast.show(t('account.profile.personal_information.error_message'), {
      type: 'ERROR',
    })
    isUpdating.value = false
    return
  }

  const { error: reloadError } = await reloadCustomer()
  // A failed reload already showed the global error toast, so a success toast
  // would be a second message.
  if (!reloadError) {
    toast.show(t('account.profile.personal_information.success_message'), {
      type: 'SUCCESS',
    })
  }
  isUpdating.value = false
}

watch(customer, () => Object.assign(payload, initPayload()), {
  immediate: true,
})
</script>
