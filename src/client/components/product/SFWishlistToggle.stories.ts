import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test'
import { router, usePage } from '@inertiajs/vue3'
import type { Wishlist } from '@scayle/storefront/types'
import { createMockListingProduct } from '../../../test/mock-data/products'
import SFWishlistToggle from './SFWishlistToggle.vue'

const product = createMockListingProduct({ images: [], siblings: [] })

const wishlistWithProduct: Wishlist = {
  items: [{ key: 'item-1', productId: product.id, product, customData: {} }],
}

/**
 * SFWishlistToggle is the heart button that adds a product to the wishlist or
 * removes it, on product cards, the product detail page and the basket. It
 * reads the wishlist from the shared page props, so its state follows the
 * `wishlist` prop rather than a prop of its own.
 *
 * While a toggle is in flight the button is `aria-disabled` and ignores further
 * clicks. Every toggle for the same product shares that state.
 *
 * In Storybook the RPC mock answers every toggle with `added` and the page
 * props never change, so the heart does not switch after a click.
 */
export default {
  title: 'Product/SFWishlistToggle',
  component: SFWishlistToggle,
  parameters: { layout: 'centered' },
  args: {
    product,
    productListType: 'category',
  },
  argTypes: {
    product: { control: false },
    productListType: { control: false },
    productListId: { control: false },
  },
} satisfies Meta<typeof SFWishlistToggle>

type Story = StoryObj<typeof SFWishlistToggle>

/**
 * Product not on the wishlist: outlined heart. The play step clicks it and
 * checks that the toggle settles against the Storybook RPC mock.
 */
export const NotInWishlist: Story = {
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByTestId(
      'add-item-to-wishlist-button',
    )
    await userEvent.click(toggle)
    // Storybook aliases `router` to the spies in `.storybook/inertia-mock.ts`, so `this` is not used.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    await waitFor(() => expect(router.reload).toHaveBeenCalled())
    await waitFor(() => expect(toggle).not.toHaveAttribute('aria-disabled'))
  },
}

/** Product on the wishlist: filled accent heart, labelled as a remove action. */
export const InWishlist: Story = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, wishlist: wishlistWithProduct },
    })
  },
}
