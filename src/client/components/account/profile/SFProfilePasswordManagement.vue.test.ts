import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import type { Customer } from '@scayle/storefront/types'
import { createMockCustomer } from '@test/mock-data/customers'
import { t } from '@test/mocks/vue-i18n'
import { createSafeSuccess, createSafeFailure } from '@test/utils/orpc'
import SFProfilePasswordManagement from './SFProfilePasswordManagement.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const updatePasswordMock = vi.fn()
const showToastMock = vi.fn()
const announceMock = vi.fn()

const customerRef = ref<Customer | undefined>(createMockCustomer())

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    profile: { updatePassword: updatePasswordMock },
  }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: showToastMock }),
}))

vi.mock('@client/composables/useCustomer', () => ({
  useCustomer: () => ({ customer: customerRef }),
}))

vi.mock('@client/composables/useAnnouncer', () => ({
  useAnnouncer: () => ({ announce: announceMock }),
}))

const stubs = {
  SFButton: {
    template: '<button v-bind="$attrs"><slot /></button>',
    props: ['loading', 'type'],
  },
  SFPasswordInput: {
    template:
      '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'hasErrors', 'readonly'],
    emits: ['update:modelValue'],
    methods: {
      focus(this: { $el: HTMLInputElement }) {
        this.$el.focus()
      },
    },
  },
  SFErrorMessageContainer: {
    template: '<div>{{ message }}</div>',
    props: ['message'],
  },
}

const mountComponent = () =>
  mount(SFProfilePasswordManagement, {
    attachTo: document.body,
    global: { stubs, mocks: { $t: t } },
  })

const currentPasswordInput = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>('[data-testid="current-password"]')

const newPasswordInput = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>('[data-testid="new-password"]')

// Reads the validation message rendered for a field through the
// `aria-describedby` link a screen reader follows.
const fieldError = (wrapper: VueWrapper, testId: string) => {
  const errorId = wrapper
    .get(`[data-testid="${testId}"]`)
    .attributes('aria-describedby')
  return wrapper.get(`[id="${errorId}"]`).text()
}

const submit = async (wrapper: VueWrapper) => {
  await wrapper.get('[data-testid="password-update-form"]').trigger('submit')
  await flushPromises()
}

const submitPasswords = async (
  wrapper: VueWrapper,
  password: string,
  newPassword: string,
) => {
  await currentPasswordInput(wrapper).setValue(password)
  await newPasswordInput(wrapper).setValue(newPassword)
  await submit(wrapper)
}

describe('SFProfilePasswordManagement', () => {
  beforeEach(() => {
    customerRef.value = createMockCustomer({
      authentication: { type: 'password' },
    })
    updatePasswordMock.mockResolvedValue(createSafeSuccess(undefined))
  })

  it('shows the password form and its description to a customer who signs in with a password', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('[data-testid="password-update-form"]').exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain(
      'account.profile.password_management.description',
    )
  })

  it.for([
    { name: 'facebook', authentication: { type: 'facebook' } },
    { name: 'apple', authentication: { type: 'apple' } },
    { name: 'no authentication', authentication: undefined },
  ])(
    'hides the form and shows the identity provider description for $name',
    ({ authentication }) => {
      customerRef.value = createMockCustomer({ authentication })
      const wrapper = mountComponent()

      expect(
        wrapper.find('[data-testid="password-update-form"]').exists(),
      ).toBe(false)
      expect(wrapper.text()).toContain(
        'account.profile.password_management.idp_description',
      )
    },
  )

  it('renders hidden email field for browser autofill', () => {
    const wrapper = mountComponent()

    const hiddenEmail = wrapper.find('input[type="email"]')
    expect(hiddenEmail.exists()).toBe(true)
    expect(hiddenEmail.attributes('aria-hidden')).toBe('true')
    expect(hiddenEmail.attributes('tabindex')).toBe('-1')
  })

  // The server applies the same patterns, so a password the form lets through
  // would only fail after a round trip. A hyphen is outside the special
  // character set the server accepts.
  it.for([
    { name: 'no uppercase letter', newPassword: 'newpass1!' },
    {
      name: 'a special character the server rejects',
      newPassword: 'NewPass1-',
    },
  ])(
    'rejects a new password with $name without sending it',
    async ({ newPassword }) => {
      const wrapper = mountComponent()

      await submitPasswords(wrapper, 'OldPass1!', newPassword)

      expect(fieldError(wrapper, 'new-password')).toBe(
        'account.validation.password',
      )
      expect(updatePasswordMock).not.toHaveBeenCalled()
    },
  )

  it('focuses the first invalid field and announces the error count instead of sending an invalid form', async () => {
    const wrapper = mountComponent()

    await submitPasswords(wrapper, 'OldPass1!', '')

    expect(document.activeElement).toBe(newPasswordInput(wrapper).element)
    expect(announceMock).toHaveBeenCalledWith(
      'account.validation.form_error_summary(1)',
    )
    expect(updatePasswordMock).not.toHaveBeenCalled()
  })

  it('sends the current and the new password on a valid submit', async () => {
    const wrapper = mountComponent()

    await submitPasswords(wrapper, 'OldPass1!', 'NewPass1!')

    expect(updatePasswordMock).toHaveBeenCalledExactlyOnceWith({
      password: 'OldPass1!',
      newPassword: 'NewPass1!',
    })
  })

  it('shows a success toast and clears the fields without validation errors after the update', async () => {
    const wrapper = mountComponent()

    await submitPasswords(wrapper, 'OldPass1!', 'NewPass1!')

    expect(showToastMock).toHaveBeenCalledWith(
      'account.profile.password_management.success_message',
      { type: 'SUCCESS' },
    )
    expect(currentPasswordInput(wrapper).element.value).toBe('')
    expect(newPasswordInput(wrapper).element.value).toBe('')
    expect(fieldError(wrapper, 'current-password')).toBe('')
    expect(fieldError(wrapper, 'new-password')).toBe('')
  })

  it('ignores a second submit while the update is in flight', async () => {
    updatePasswordMock.mockReturnValue(new Promise(() => {}))
    const wrapper = mountComponent()

    await submitPasswords(wrapper, 'OldPass1!', 'NewPass1!')
    await submit(wrapper)

    expect(updatePasswordMock).toHaveBeenCalledOnce()
  })

  it.for([
    {
      name: 'a wrong current password',
      result: createSafeFailure({ code: 'FORBIDDEN' }, true),
      message: 'account.profile.password_management.error.wrong_password',
    },
    {
      name: 'a known but unmapped error',
      result: createSafeFailure({ code: 'UNAUTHORIZED' }, true),
      message: 'account.profile.password_management.error.400_bad_request',
    },
    {
      name: 'an unrecognized error',
      result: createSafeFailure(new Error('network down'), false),
      message: 'account.profile.password_management.error.400_bad_request',
    },
  ])('shows the matching message for $name', async ({ result, message }) => {
    updatePasswordMock.mockResolvedValue(result)
    const wrapper = mountComponent()

    await submitPasswords(wrapper, 'OldPass1!', 'NewPass1!')

    expect(wrapper.get('[data-testid="password-error-message"]').text()).toBe(
      message,
    )
  })
})
