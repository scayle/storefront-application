import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import {
  createMockOrderItem,
  saleItemPrice,
} from '../../../test/mock-data/orders'
import SFOrderSuccessProductCard from './SFOrderSuccessProductCard.vue'

/**
 * SFOrderSuccessProductCard displays a single order item on the order success page.
 * Shows the product image, brand, name, color, size, subscription info, and price.
 * Links to the product detail page.
 *
 * Uses pre-mapped order data so the component renders formatted values directly.
 */
export default {
  title: 'Order Success/SFOrderSuccessProductCard',
  component: SFOrderSuccessProductCard,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFOrderSuccessProductCard>) => ({
    components: { SFOrderSuccessProductCard },
    setup() {
      return { args }
    },
    template: `<div class="max-w-112"><SFOrderSuccessProductCard v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderSuccessProductCard>

type Story = StoryObj<typeof SFOrderSuccessProductCard>

/**
 * Default order item with no reductions.
 */
export const Default: Story = {
  args: {
    item: createMockOrderItem(),
  },
}

/**
 * Order item with a sale reduction showing strike-through pricing.
 */
export const WithSaleReduction: Story = {
  args: {
    item: createMockOrderItem({ price: saleItemPrice }),
  },
}

/**
 * Order item with a stored subscription (interval and follow-up delivery).
 */
export const WithSubscription: Story = {
  args: {
    item: createMockOrderItem({
      subscriptionDefinition: {
        subscriptionInterval: 'P1M',
        subscriptionDeliveryDate: '1',
      },
      variant: {
        ...createMockOrderItem().variant,
        subscription: { intervals: [{ label: 'Monthly', value: 'P1M' }] },
      },
    }),
  },
}
