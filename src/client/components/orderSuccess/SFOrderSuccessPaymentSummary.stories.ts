import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { defaultCost } from '../../../test/mock-data/orders'
import SFOrderSuccessPaymentSummary from './SFOrderSuccessPaymentSummary.vue'

/**
 * SFOrderSuccessPaymentSummary shows the order cost breakdown: subtotal, shipping, other fees
 * when the order has any, and total.
 * All values are pre-formatted currency strings from the server.
 */
export default {
  title: 'Order Success/SFOrderSuccessPaymentSummary',
  component: SFOrderSuccessPaymentSummary,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFOrderSuccessPaymentSummary>,
  ) => ({
    components: { SFOrderSuccessPaymentSummary },
    setup() {
      return { args }
    },
    template: `<div class="max-w-112"><SFOrderSuccessPaymentSummary v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderSuccessPaymentSummary>

type Story = StoryObj<typeof SFOrderSuccessPaymentSummary>

/**
 * Default payment summary with shipping fee.
 */
export const Default: Story = {
  args: {
    cost: defaultCost,
  },
}

/**
 * Free shipping: no delivery fee in applied fees.
 */
export const FreeShipping: Story = {
  args: {
    cost: defaultCost,
  },
}

/**
 * A non-delivery fee, for example a cash on delivery payment fee, in its own
 * row, so the rows add up to the total.
 */
export const WithOtherFees: Story = {
  args: {
    cost: { ...defaultCost, subtotal: '$47.00', otherFees: '$2.00' },
  },
}
