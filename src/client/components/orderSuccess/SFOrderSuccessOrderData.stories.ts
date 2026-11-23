import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { createMockOrder } from '../../../test/mock-data/orders'
import SFOrderSuccessOrderData from './SFOrderSuccessOrderData.vue'

/**
 * SFOrderSuccessOrderData shows the order date and order number inside a detail box.
 * Used in the left column of the order success page.
 */
export default {
  title: 'Order Success/SFOrderSuccessOrderData',
  component: SFOrderSuccessOrderData,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFOrderSuccessOrderData>) => ({
    components: { SFOrderSuccessOrderData },
    setup() {
      return { args }
    },
    template: `<div class="max-w-sm"><SFOrderSuccessOrderData v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderSuccessOrderData>

type Story = StoryObj<typeof SFOrderSuccessOrderData>

/**
 * Default order data with a confirmed date and order number.
 */
export const Default: Story = {
  args: {
    order: createMockOrder(),
  },
}
