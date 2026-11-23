import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import {
  createMockOrderItem,
  defaultProduct,
  defaultVariant,
} from '../../../../../test/mock-data/orders'
import SFOrderDetailProductCard from './SFOrderDetailProductCard.vue'

/**
 * SFOrderDetailProductCard shows one order item on the account order detail
 * page: image, brand, name, color, size, quantity, subscription details, and
 * price. The whole card links to the product detail page.
 */
export default {
  title: 'Account/Orders/Detail/SFOrderDetailProductCard',
  component: SFOrderDetailProductCard,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFOrderDetailProductCard>) => ({
    components: { SFOrderDetailProductCard },
    setup() {
      return { args }
    },
    template: `<div class="w-[640px] max-w-full"><SFOrderDetailProductCard v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderDetailProductCard>

type Story = StoryObj<typeof SFOrderDetailProductCard>

/** Order item with a product image. */
export const WithImage: Story = {
  args: {
    orderItem: createMockOrderItem(),
  },
}

/** Order item whose product has no image, so the details start at the left edge. */
export const WithoutImage: Story = {
  args: {
    orderItem: createMockOrderItem({
      product: { ...defaultProduct, image: undefined },
    }),
  },
}

/**
 * Product without brand and color attributes. The mapper leaves both empty,
 * and the card hides the brand line and the color row.
 */
export const WithoutBrandAndColor: Story = {
  args: {
    orderItem: createMockOrderItem({
      product: { ...defaultProduct, brand: '', color: '' },
    }),
  },
}

/** Subscription order item with its delivery interval and delivery day. */
export const Subscription: Story = {
  args: {
    orderItem: createMockOrderItem({
      subscriptionDefinition: {
        subscriptionInterval: 'P1M',
        subscriptionDeliveryDate: '1',
      },
      variant: {
        ...defaultVariant,
        subscription: { intervals: [{ label: 'Monthly', value: 'P1M' }] },
      },
    }),
  },
}
