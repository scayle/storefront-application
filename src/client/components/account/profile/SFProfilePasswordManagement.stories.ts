import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { provide } from 'vue'
import {
  fail,
  signInAs,
  storybookCustomer,
  storybookRpcClient,
} from '../../../../../.storybook/rpc-mock'
import { RPC_CLIENT_KEY } from '../../../utils/orpc'
import SFToastContainer from '../../ui/toast/SFToastContainer.vue'
import SFProfilePasswordManagement from './SFProfilePasswordManagement.vue'

const rejectCurrentPassword: Decorator = () => ({
  setup() {
    provide(RPC_CLIENT_KEY, {
      ...storybookRpcClient,
      profile: {
        ...storybookRpcClient.profile,
        updatePassword: () => fail('FORBIDDEN'),
      },
    })
  },
  template: '<story />',
})

const submitPasswords = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByTestId('current-password'), 'Current1!')
  await userEvent.type(canvas.getByTestId('new-password'), 'Storybook1!')
  await userEvent.click(canvas.getByTestId('password-submit'))
  return canvas
}

/**
 * SFProfilePasswordManagement is the password card on the account profile
 * page. A customer who signed in with a password gets a form for the current
 * and the new password, sent through the `profile.updatePassword` procedure.
 * A customer who signed in with an identity provider manages their password
 * there, so the card shows a note instead of the form.
 *
 * A wrong current password and a rejected new password show a message above
 * the fields. A successful update shows a toast, so the stories render a toast
 * container next to the card.
 */
export default {
  title: 'Account/Profile/SFProfilePasswordManagement',
  component: SFProfilePasswordManagement,
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
} satisfies Meta<typeof SFProfilePasswordManagement>

type Story = StoryObj<typeof SFProfilePasswordManagement>

/**
 * Customer who signed in with a password. The play step enters a current and a
 * valid new password, submits the form and waits for the success toast.
 */
export const PasswordCustomer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await submitPasswords(canvasElement)
    // The toast fades in, so it is in the DOM before it is visible. Success
    // toasts have the `status` role and error toasts `alert`.
    const toast = await canvas.findByTestId('toast-info')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(toast).toHaveAttribute('role', 'status')
  },
}

/**
 * Customer who signed in with an identity provider. The form is hidden and the
 * card points to the provider's settings instead.
 */
export const IdentityProviderCustomer: Story = {
  beforeEach() {
    signInAs({ ...storybookCustomer, authentication: { type: 'google' } })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('profile-password-headline')).toBeVisible()
    await expect(canvas.queryByTestId('password-update-form')).toBeNull()
  },
}

/**
 * Current password the Storefront API does not accept. The play step submits
 * the form and waits for the message above the fields.
 */
export const WrongCurrentPassword: Story = {
  decorators: [rejectCurrentPassword],
  play: async ({ canvasElement }) => {
    const canvas = await submitPasswords(canvasElement)
    // `SFHint` does not pass `data-testid` on, so the message is found by its
    // role. It fades in, so it is in the DOM before it is visible.
    const form = within(canvas.getByTestId('password-update-form'))
    await waitFor(() => expect(form.getByRole('alert')).toBeVisible())
  },
}
