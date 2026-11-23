import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { provide } from 'vue'
import {
  fail,
  signInAs,
  storybookCustomer,
  storybookRpcClient,
} from '../../../../../.storybook/rpc-mock'
import { RPC_CLIENT_KEY } from '../../../utils/orpc'
import SFToastContainer from '../../ui/toast/SFToastContainer.vue'
import SFProfilePersonalInformation from './SFProfilePersonalInformation.vue'

const failUpdate: Decorator = () => ({
  setup() {
    provide(RPC_CLIENT_KEY, {
      ...storybookRpcClient,
      profile: {
        ...storybookRpcClient.profile,
        // The procedure declares no `.errors()`, so a failure reaches the
        // client with `isDefined: false`.
        updatePersonalInfo: () =>
          fail('INTERNAL_SERVER_ERROR', { defined: false }),
      },
    })
  },
  template: '<story />',
})

const updatePersonalInfo = fn(storybookRpcClient.profile.updatePersonalInfo)

const spyOnUpdate: Decorator = () => ({
  setup() {
    provide(RPC_CLIENT_KEY, {
      ...storybookRpcClient,
      profile: { ...storybookRpcClient.profile, updatePersonalInfo },
    })
  },
  template: '<story />',
})

const changeFirstName = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  const firstName = canvas.getByTestId('user-first-name')
  await userEvent.clear(firstName)
  await userEvent.type(firstName, 'Janet')
  return canvas
}

/**
 * SFProfilePersonalInformation is the form on the account profile page where
 * the signed-in customer changes their gender, first name, last name and birth
 * date. It reads the customer from the shared page props and sends the update
 * through the `profile.updatePersonalInfo` procedure. The outcome is shown as a
 * toast, so the stories render a toast container next to the form.
 *
 * The save button stays `aria-disabled` until a field differs from the saved
 * customer. In Storybook the reload after a successful save returns no new page
 * props, so the form keeps the edited values.
 */
export default {
  title: 'Account/Profile/SFProfilePersonalInformation',
  component: SFProfilePersonalInformation,
  decorators: [
    () => ({
      components: { SFToastContainer },
      template:
        '<div class="w-[480px] max-w-full"><SFToastContainer /><story /></div>',
    }),
  ],
  beforeEach() {
    signInAs(storybookCustomer)
  },
} satisfies Meta<typeof SFProfilePersonalInformation>

type Story = StoryObj<typeof SFProfilePersonalInformation>

/**
 * Form filled with the saved customer. Nothing has changed yet, so the save
 * button is `aria-disabled`.
 */
export const Unchanged: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByTestId('personal-info-submit'),
    ).toHaveAttribute('aria-disabled', 'true')
  },
}

/**
 * First name edited and saved. The play step changes the first name, submits
 * the form and waits for the success toast.
 */
export const Changed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await changeFirstName(canvasElement)
    await userEvent.click(canvas.getByTestId('personal-info-submit'))
    // The toast fades in, so it is in the DOM before it is visible. Success
    // toasts have the `status` role and error toasts `alert`.
    const toast = await canvas.findByTestId('toast-info')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(toast).toHaveAttribute('role', 'status')
  },
}

/**
 * Update the Storefront API rejects. The play step submits a changed first
 * name and waits for the error toast, after which the form can be submitted
 * again.
 */
export const UpdateFailed: Story = {
  decorators: [failUpdate],
  play: async ({ canvasElement }) => {
    const canvas = await changeFirstName(canvasElement)
    const submit = canvas.getByTestId('personal-info-submit')
    await userEvent.click(submit)
    await waitFor(() => expect(canvas.getByRole('alert')).toBeVisible())
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-disabled'))
  },
}

/**
 * Saved customer whose birth date is before 1900 changes their first name and
 * saves. The browser accepts the date, since the input sets no `min`, and the
 * birth date was never edited, so the save button stays usable. Only the
 * submit validation rejects it. The play step checks that focus moves to the
 * birth date and that no update is sent.
 */
export const InvalidSubmit: Story = {
  decorators: [spyOnUpdate],
  beforeEach() {
    signInAs({ ...storybookCustomer, birthDate: '1899-12-31' })
    updatePersonalInfo.mockClear()
  },
  play: async ({ canvasElement }) => {
    const canvas = await changeFirstName(canvasElement)
    await userEvent.click(canvas.getByTestId('personal-info-submit'))
    const birthDate = canvas.getByTestId('user-birthdate')
    // Focus moves to the first invalid field only once the submit handler has
    // taken the invalid branch, so the update could not have been sent.
    await waitFor(() => expect(birthDate).toHaveFocus())
    await waitFor(() =>
      expect(birthDate).toHaveAttribute('aria-invalid', 'true'),
    )
    await expect(updatePersonalInfo).not.toHaveBeenCalled()
  },
}

/**
 * Saved customer empties their birth date. The Customer Account API can change
 * a stored birth date but not remove it, so the field is required once the
 * customer has one. The play step clears the field, leaves it and checks that
 * the field is marked invalid and the save button is `aria-disabled`.
 */
export const ClearedBirthDate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const birthDate = canvas.getByTestId('user-birthdate')
    await userEvent.clear(birthDate)
    await userEvent.tab()
    await waitFor(() =>
      expect(birthDate).toHaveAttribute('aria-invalid', 'true'),
    )
    await expect(canvas.getByTestId('personal-info-submit')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  },
}
