import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import {
  createMockOrder,
  createMockOrderDelivery,
  createMockOrderItem,
} from '../../../../../test/mock-data/orders'
import SFOrderDetailProductList from './SFOrderDetailProductList.vue'

/**
 * SFOrderDetailProductList lists the order items on the account order detail
 * page, grouped by delivery.
 */
export default {
  title: 'Account/Orders/Detail/SFOrderDetailProductList',
  component: SFOrderDetailProductList,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFOrderDetailProductList>) => ({
    components: { SFOrderDetailProductList },
    setup() {
      return { args }
    },
    template: `<div class="w-[640px] max-w-full"><SFOrderDetailProductList v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderDetailProductList>

type Story = StoryObj<typeof SFOrderDetailProductList>

/** One delivery with two items. */
export const OneDelivery: Story = {
  args: {
    order: createMockOrder(),
  },
}

/**
 * Items split across two deliveries. Deliveries have no heading, so the second
 * one starts after a gap instead of a divider.
 */
export const SeveralDeliveries: Story = {
  args: {
    order: createMockOrder({
      deliveries: [
        createMockOrderDelivery(),
        createMockOrderDelivery({
          id: 2,
          items: [createMockOrderItem({ id: 3, packageId: 2 })],
        }),
      ],
    }),
  },
}
