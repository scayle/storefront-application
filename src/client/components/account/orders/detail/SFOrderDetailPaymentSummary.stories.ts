import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { defaultCost } from '../../../../../test/mock-data/orders'
import SFOrderDetailPaymentSummary from './SFOrderDetailPaymentSummary.vue'

/**
 * SFOrderDetailPaymentSummary closes the account order detail page with the
 * subtotal, shipping costs, other fees when the order has any, and total.
 * The line under the total says whether the prices include VAT. All amounts
 * are formatted by the server.
 */
export default {
  title: 'Account/Orders/Detail/SFOrderDetailPaymentSummary',
  component: SFOrderDetailPaymentSummary,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFOrderDetailPaymentSummary>,
  ) => ({
    components: { SFOrderDetailPaymentSummary },
    setup() {
      return { args }
    },
    template: `<div class="w-[640px] max-w-full"><SFOrderDetailPaymentSummary v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderDetailPaymentSummary>

type Story = StoryObj<typeof SFOrderDetailPaymentSummary>

/** Prices include VAT. */
export const IncludingTax: Story = {
  args: {
    cost: defaultCost,
  },
}

/** Prices exclude VAT. */
export const ExcludingTax: Story = {
  args: {
    cost: { ...defaultCost, includesTax: false },
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
