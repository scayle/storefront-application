import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'

import type { RFC3339Date } from '@scayle/storefront-api'
import { createMockBasketItem } from '../../../test/mock-data/basket'

import SFBasketCard from './SFBasketCard.vue'

const availableItem = createMockBasketItem()

/**
 * Sold-out variant: `variant.isSoldOut` is true and the item is unavailable.
 * This hides the quantity input (`v-if="!item.variant.isSoldOut"`), which is the
 * exact condition behind the mobile price-alignment fix.
 */
const soldOutItem = createMockBasketItem({
  status: 'unavailable',
  availableQuantity: 0,
  variant: {
    ...availableItem.variant,
    stock: 0,
    isSoldOut: true,
  },
})

/**
 * A single basket line item. Renders product image, brand/name, quantity input,
 * price, and the sold-out / out-of-timeframe headlines.
 *
 * The component switches layout between desktop (price right-aligned inside the
 * info column) and mobile (`<lg`, price in a separate row below). Use the
 * Storybook viewport tool — the sold-out stories default to a phone width so the
 * mobile layout is visible.
 */
export default {
  title: 'Basket/SFBasketCard',
  component: SFBasketCard,
  parameters: { layout: 'centered' },
  // The card is an <li>; the sold-out headline only shows for the first item in
  // its group (`group-first:flex`), so wrap in a <ul> and constrain to the
  // basket column width.
  render: (args: ComponentPropsAndSlots<typeof SFBasketCard>) => ({
    components: { SFBasketCard },
    setup() {
      return { args }
    },
    template: '<ul class="max-w-xl"><SFBasketCard v-bind="args" /></ul>',
  }),
} satisfies Meta<typeof SFBasketCard>

type Story = StoryObj<typeof SFBasketCard>

/** In-stock item: quantity input present, price right-aligned on every viewport. */
export const Available: Story = {
  args: {
    item: availableItem,
  },
}

/**
 * Sold-out item viewed at mobile width. The quantity input is hidden, so the
 * price must stay right-aligned on its own — this is the case the `ml-auto` fix
 * addresses. Compare against {@link Available}.
 */
export const SoldOutMobile: Story = {
  args: {
    item: soldOutItem,
  },
  parameters: {
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '390px', height: '820px' } },
      },
    },
    initialGlobals: {
      viewport: { value: 'mobile' },
    },
  },
}

/** Same sold-out item at desktop width, where the price was already correct. */
export const SoldOutDesktop: Story = {
  args: {
    item: soldOutItem,
  },
}

/**
 * In-stock item whose product is not on sale yet (`sellableTimeframe.state` is
 * `future`). The card shows the "coming soon" headline. A sold-out variant
 * shows the sold-out headline instead, see {@link SoldOutDesktop}.
 */
export const NotYetSellable: Story = {
  args: {
    item: createMockBasketItem({
      product: {
        ...availableItem.product,
        sellableTimeframe: {
          state: 'future',
          sellableFrom: '2999-01-01T00:00:00+00:00' as RFC3339Date,
        },
      },
    }),
  },
}

/**
 * In-stock item whose product is no longer on sale (`sellableTimeframe.state`
 * is `past`). The card shows the "product archived" headline.
 */
export const NoLongerSellable: Story = {
  args: {
    item: createMockBasketItem({
      product: {
        ...availableItem.product,
        sellableTimeframe: {
          state: 'past',
          sellableTo: '2000-01-01T00:00:00+00:00' as RFC3339Date,
        },
      },
    }),
  },
}
