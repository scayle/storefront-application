import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { defaultPayment } from '../../../test/mock-data/orders'
import SFOrderSuccessPaymentData from './SFOrderSuccessPaymentData.vue'

/**
 * SFOrderSuccessPaymentData displays the payment method used for the order.
 * Shows the first payment key from the order's payment array.
 */
export default {
  title: 'Order Success/SFOrderSuccessPaymentData',
  component: SFOrderSuccessPaymentData,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFOrderSuccessPaymentData>) => ({
    components: { SFOrderSuccessPaymentData },
    setup() {
      return { args }
    },
    template: `<div class="max-w-sm"><SFOrderSuccessPaymentData v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderSuccessPaymentData>

type Story = StoryObj<typeof SFOrderSuccessPaymentData>

/**
 * Payment data with a credit card payment method.
 */
export const Default: Story = {
  args: {
    payment: defaultPayment,
  },
}

/**
 * Payment data with PayPal as the payment method.
 */
export const PayPal: Story = {
  args: {
    payment: [{ key: 'paypal' }],
  },
}
