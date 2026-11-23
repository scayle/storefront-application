import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import { storybookCustomer } from '../../../../../../../.storybook/rpc-mock'
import SFAccountLink from './SFAccountLink.vue'

/**
 * SFAccountLink is the account icon in the header.
 *
 * Key features:
 * - Below the `lg` breakpoint: an icon link to the account page, or to sign-in for a signed-out user
 * - From `lg` up: an icon that opens a popover on hover or keyboard activation and goes to the account page on click
 * - The popover offers sign in and sign up to a signed-out user, and greets a signed-in customer with account links and a sign-out button
 * - Waits for the deferred `customer` prop: until it arrives, the popover stays empty and the mobile link points to sign-in
 *
 * The stories pin the desktop viewport and open the popover, since the icon
 * looks the same in every state and only the popover content differs.
 */
export default {
  title: 'UI/Navigation/Header/Links/SFAccountLink',
  component: SFAccountLink,
  parameters: { layout: 'centered' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
} satisfies Meta<typeof SFAccountLink>

type Story = StoryObj<typeof SFAccountLink>

const openPopover = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  const trigger = canvas.getByTestId('account-popover-trigger')
  // Storybook resizes the canvas to the pinned viewport only after the first
  // render, and the trigger is hidden below `lg` until then. On a viewport
  // narrower than `lg` the play fails here.
  await waitFor(() => expect(trigger).toBeVisible())
  await userEvent.hover(trigger)
  // Checked through `aria-expanded` rather than `toBeVisible` on the popover:
  // it fades in, and a background tab pauses the fade at opacity 0.
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
  return within(canvas.getByTestId('account-popover'))
}

/**
 * Signed-out user whose `customer` prop has arrived: the popover offers sign in
 * and sign up.
 */
export const SignedOut = {
  play: async ({ canvasElement }) => {
    const popover = await openPopover(canvasElement)
    await expect(
      popover.getByTestId('account-popover-login-button'),
    ).toBeInTheDocument()
    await expect(
      popover.getByTestId('account-popover-register-button'),
    ).toBeInTheDocument()
  },
} satisfies Story

/**
 * Signed-in customer: the popover greets them by first name and lists the
 * account links and the sign-out button.
 */
export const SignedIn = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, customer: storybookCustomer },
    })
  },
  play: async ({ canvasElement }) => {
    const popover = await openPopover(canvasElement)
    await expect(popover.getByTestId('account-popover-name')).toHaveTextContent(
      'Jane',
    )
    await expect(
      popover.getByTestId('account-popover-logout-button'),
    ).toBeInTheDocument()
  },
} satisfies Story

/**
 * The `customer` prop is still deferred: the popover opens empty, since it
 * cannot yet tell whether to offer sign in or greet a customer.
 */
export const CustomerLoading = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, customer: undefined },
    })
  },
  play: async ({ canvasElement }) => {
    const popover = await openPopover(canvasElement)
    await expect(
      popover.queryByTestId('account-popover-login-button'),
    ).toBeNull()
    await expect(popover.queryByTestId('account-popover-user')).toBeNull()
  },
} satisfies Story
