import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, mocked, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { Basket } from '@scayle/storefront/types'
import SFBasketLink from './SFBasketLink.vue'

/**
 * SFBasketLink is the basket icon in the header. It links to the basket page
 * and shows the number of items in the basket as a corner badge.
 *
 * Key features:
 * - Reads the count from the `basket` page prop through `useBasket`
 * - Hides the badge while the basket is empty
 * - Names the count in the link's accessible label, since the badge itself is hidden from assistive technology
 */
export default {
  title: 'UI/Navigation/Header/Links/Basket/SFBasketLink',
  component: SFBasketLink,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFBasketLink>

type Story = StoryObj<typeof SFBasketLink>

const mockItemCount = (itemCount: number) => {
  const page = usePage()
  // The link reads only `itemCount`, so the rest of the basket is left out.
  mocked(usePage).mockReturnValue({
    ...page,
    props: { ...page.props, basket: { itemCount } satisfies Partial<Basket> },
  } as unknown as ReturnType<typeof usePage>)
}

/**
 * Empty basket: the icon without a badge.
 */
export const Empty = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByTestId('header-basket-count')).toBeNull()
  },
} satisfies Story

/**
 * A few items: the badge shows the count.
 */
export const FewItems = {
  beforeEach() {
    mockItemCount(3)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('header-basket-count')).toHaveTextContent(
      '3',
    )
  },
} satisfies Story

/**
 * A three-digit count. The badge has no overflow format such as `99+`, so it
 * shows the full number and grows wider than the single-digit badge.
 */
export const ManyItems = {
  beforeEach() {
    mockItemCount(120)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('header-basket-count')).toHaveTextContent(
      '120',
    )
  },
} satisfies Story
