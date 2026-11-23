import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, mocked, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { Wishlist } from '@scayle/storefront/types'
import { createMockListingProduct } from '../../../../../../test/mock-data/products'
import SFWishlistLink from './SFWishlistLink.vue'

/**
 * SFWishlistLink is the wishlist icon in the header. It links to the wishlist
 * page and shows the number of saved products as a corner badge.
 *
 * Key features:
 * - Counts the items of the `wishlist` page prop through `useWishlist`
 * - Hides the badge while the wishlist is empty
 * - Names the count in the link's accessible label, since the badge itself is hidden from assistive technology
 */
export default {
  title: 'UI/Navigation/Header/Links/SFWishlistLink',
  component: SFWishlistLink,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFWishlistLink>

type Story = StoryObj<typeof SFWishlistLink>

const wishlist: Wishlist = {
  items: [1, 2, 3].map((id) => ({
    key: `item-${id}`,
    productId: id,
    product: createMockListingProduct({ id }),
    customData: {},
  })),
}

/**
 * Empty wishlist: the icon without a badge.
 */
export const Empty = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByTestId('header-wishlist-count')).toBeNull()
  },
} satisfies Story

/**
 * Wishlist with three saved products: the badge shows the count.
 */
export const WithItems = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, wishlist },
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('header-wishlist-count')).toHaveTextContent(
      '3',
    )
  },
} satisfies Story
