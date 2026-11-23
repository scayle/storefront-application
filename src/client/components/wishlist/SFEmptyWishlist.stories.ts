import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive } from 'vue'
import { expect, mocked, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import { signInAs, storybookCustomer } from '../../../../.storybook/rpc-mock'
import SFEmptyWishlist from './SFEmptyWishlist.vue'

/**
 * SFEmptyWishlist is the empty state shown on the wishlist page when there are no items.
 * It displays an icon, headline, description, and actions to sign in or continue shopping.
 *
 * Key features:
 * - Uses i18n for title and description (wishlist_page.empty_*)
 * - Waits for the deferred `customer` prop: until it arrives, only a continue shopping button shows
 * - Sign-in action for a signed-out user, continue shopping for everyone
 */
export default {
  title: 'Wishlist/SFEmptyWishlist',
  component: SFEmptyWishlist,
} satisfies Meta<typeof SFEmptyWishlist>

type Story = StoryObj<typeof SFEmptyWishlist>

/**
 * Signed-out user whose `customer` prop has arrived: sign in and continue shopping.
 */
export const Default = {} satisfies Story

/**
 * Signed-in customer: no sign-in action, only continue shopping.
 */
export const SignedIn = {
  beforeEach() {
    signInAs(storybookCustomer)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('wishlist-continue-shopping')).toBeVisible()
    await expect(canvas.queryByTestId('wishlist-signin')).toBeNull()
  },
} satisfies Story

/**
 * Starts with the `customer` prop still deferred, so the `<Deferred>` fallback
 * renders, then delivers it and shows the loaded actions.
 */
export const CustomerLoading = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue(
      reactive({
        ...page,
        props: { ...page.props, customer: undefined },
      }),
    )
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('Renders the fallback while customer is deferred', async () => {
      await expect(
        canvas.getByTestId('wishlist-continue-shopping-fallback'),
      ).toBeVisible()
      await expect(canvas.queryByTestId('wishlist-signin')).toBeNull()
    })

    await step('Renders the content once customer arrives', async () => {
      usePage().props.customer = null
      await expect(await canvas.findByTestId('wishlist-signin')).toBeVisible()
      await expect(
        canvas.queryByTestId('wishlist-continue-shopping-fallback'),
      ).toBeNull()
    })
  },
} satisfies Story
