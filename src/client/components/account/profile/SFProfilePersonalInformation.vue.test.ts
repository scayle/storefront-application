import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import type { Customer } from '@scayle/storefront/types'
import { createMockCustomer } from '@test/mock-data/customers'
import { t } from '@test/mocks/vue-i18n'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import SFProfilePersonalInformation from './SFProfilePersonalInformation.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const updatePersonalInfoMock = vi.fn()
const showToastMock = vi.fn()
const reloadCustomerMock = vi.fn()
const announceMock = vi.fn()

// A customer whose stored data passes every rule, so the form starts valid and
// unchanged.
const createCustomer = () =>
  createMockCustomer({
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01',
    gender: 'f',
  })

const customerRef = ref<Customer | undefined>(createCustomer())

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    profile: { updatePersonalInfo: updatePersonalInfoMock },
  }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: showToastMock }),
}))

vi.mock('@client/composables/useCustomer', () => ({
  useCustomer: () => ({
    customer: customerRef,
    reloadCustomer: reloadCustomerMock,
  }),
}))

vi.mock('@client/composables/useAnnouncer', () => ({
  useAnnouncer: () => ({ announce: announceMock }),
}))

const stubs = {
  SFButton: {
    template: '<button v-bind="$attrs"><slot /></button>',
    props: ['loading', 'type'],
  },
  SFTextInput: {
    template:
      '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: [
      'modelValue',
      'placeholder',
      'type',
      'hasErrors',
      'required',
      'readonly',
    ],
    emits: ['update:modelValue'],
    methods: {
      focus(this: { $el: HTMLInputElement }) {
        this.$el.focus()
      },
    },
  },
  SFGenderSelection: {
    template: '<div data-testid="gender-selection" tabindex="-1" />',
    props: ['modelValue', 'disabled', 'isValid', 'ariaDescribedby'],
    methods: {
      focus(this: { $el: HTMLElement }) {
        this.$el.focus()
      },
    },
  },
}

const mountComponent = () =>
  mount(SFProfilePersonalInformation, {
    attachTo: document.body,
    global: { stubs, mocks: { $t: t } },
  })

const input = (wrapper: VueWrapper, testId: string) =>
  wrapper.get<HTMLInputElement>(`[data-testid="${testId}"]`)

const submitButton = (wrapper: VueWrapper) =>
  wrapper.get('[data-testid="personal-info-submit"]')

// Reads the validation message rendered for a field through the
// `aria-describedby` link a screen reader follows.
const fieldError = (wrapper: VueWrapper, testId: string) => {
  const errorId = input(wrapper, testId).attributes('aria-describedby')
  return wrapper.get(`[id="${errorId}"]`).text()
}

const submit = async (wrapper: VueWrapper) => {
  await wrapper.get('[data-testid="personal-info-form"]').trigger('submit')
  await flushPromises()
}

describe('SFProfilePersonalInformation', () => {
  beforeEach(() => {
    customerRef.value = createCustomer()
    updatePersonalInfoMock.mockResolvedValue(createSafeSuccess(undefined))
    reloadCustomerMock.mockResolvedValue({})
  })

  it('does not submit when data has not changed', async () => {
    const wrapper = mountComponent()

    await submit(wrapper)

    expect(updatePersonalInfoMock).not.toHaveBeenCalled()
  })

  it('marks the save button unavailable and points it to the no-changes hint while nothing has changed', () => {
    const wrapper = mountComponent()

    const button = submitButton(wrapper)
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(
      wrapper.get(`[id="${button.attributes('aria-describedby')}"]`).text(),
    ).toBe('account.profile.personal_information.no_changes')
  })

  it('removes the no-changes hint once a field changes', async () => {
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')

    const button = submitButton(wrapper)
    expect(button.attributes('aria-disabled')).toBe('false')
    expect(button.attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.text()).not.toContain(
      'account.profile.personal_information.no_changes',
    )
  })

  it('focuses the first invalid field and announces the error count instead of sending an invalid form', async () => {
    const wrapper = mountComponent()

    await input(wrapper, 'user-last-name').setValue('')
    await input(wrapper, 'user-birthdate').setValue('2999-01-01')
    await submit(wrapper)

    expect(document.activeElement).toBe(
      input(wrapper, 'user-last-name').element,
    )
    expect(announceMock).toHaveBeenCalledWith(
      'account.validation.form_error_summary(2)',
    )
    expect(updatePersonalInfoMock).not.toHaveBeenCalled()
  })

  it.for([
    {
      name: 'in the future',
      birthDate: '2999-01-01',
      message:
        'account.validation.past_date({"field":"account.form_fields.birth_date"})',
    },
    {
      name: 'before 1900',
      birthDate: '1899-12-31',
      message:
        'account.validation.date({"field":"account.form_fields.birth_date"})',
    },
  ])(
    'rejects a birth date $name without sending it',
    async ({ birthDate, message }) => {
      const wrapper = mountComponent()

      await input(wrapper, 'user-birthdate').setValue(birthDate)
      await submit(wrapper)

      expect(fieldError(wrapper, 'user-birthdate')).toBe(message)
      expect(updatePersonalInfoMock).not.toHaveBeenCalled()
    },
  )

  it('sends the edited personal data on a valid submit', async () => {
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')
    await submit(wrapper)

    expect(updatePersonalInfoMock).toHaveBeenCalledExactlyOnceWith({
      firstName: 'Jane',
      lastName: 'Doe',
      gender: 'f',
      birthDate: '1990-01-01',
    })
  })

  it('rejects clearing a stored birth date without sending the form', async () => {
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')
    await input(wrapper, 'user-birthdate').setValue('')
    await submit(wrapper)

    expect(fieldError(wrapper, 'user-birthdate')).toBe(
      'account.validation.required({"field":"account.form_fields.birth_date"})',
    )
    expect(updatePersonalInfoMock).not.toHaveBeenCalled()
  })

  it('saves the other fields without a birth date when the customer never had one', async () => {
    customerRef.value = createMockCustomer({
      firstName: 'John',
      lastName: 'Doe',
      birthDate: undefined,
      gender: 'f',
    })
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')
    await submit(wrapper)

    expect(updatePersonalInfoMock).toHaveBeenCalledExactlyOnceWith({
      firstName: 'Jane',
      lastName: 'Doe',
      gender: 'f',
      birthDate: undefined,
    })
  })

  it('shows a success toast and reloads the customer after the update', async () => {
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')
    await submit(wrapper)

    expect(showToastMock).toHaveBeenCalledExactlyOnceWith(
      'account.profile.personal_information.success_message',
      { type: 'SUCCESS' },
    )
    expect(reloadCustomerMock).toHaveBeenCalledOnce()
  })

  // The global error toast already reported the failed reload.
  it('shows no toast of its own when the customer reload fails', async () => {
    reloadCustomerMock.mockResolvedValue({ error: new Error('network down') })
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')
    await submit(wrapper)

    expect(showToastMock).not.toHaveBeenCalled()
  })

  it('shows an error toast and lets the customer submit again when the update fails', async () => {
    updatePersonalInfoMock.mockResolvedValue(
      createSafeFailure(new Error('network down')),
    )
    const wrapper = mountComponent()

    await input(wrapper, 'user-first-name').setValue('Jane')
    await submit(wrapper)
    await submit(wrapper)

    expect(showToastMock).toHaveBeenCalledWith(
      'account.profile.personal_information.error_message',
      { type: 'ERROR' },
    )
    expect(reloadCustomerMock).not.toHaveBeenCalled()
    expect(updatePersonalInfoMock).toHaveBeenCalledTimes(2)
  })
})
