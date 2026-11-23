import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import {
  createMockOrder,
  separateAddresses,
} from '../../../../../test/mock-data/orders'
import SFOrderDetailBaseInformation from './SFOrderDetailBaseInformation.vue'

/**
 * SFOrderDetailBaseInformation is the top block of the account order detail
 * page: order date, payment method, and the delivery and billing addresses.
 * When both addresses render the same, one full-width box replaces the pair.
 */
export default {
  title: 'Account/Orders/Detail/SFOrderDetailBaseInformation',
  component: SFOrderDetailBaseInformation,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFOrderDetailBaseInformation>,
  ) => ({
    components: { SFOrderDetailBaseInformation },
    setup() {
      return { args }
    },
    template: `<div class="w-[640px] max-w-full"><SFOrderDetailBaseInformation v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderDetailBaseInformation>

type Story = StoryObj<typeof SFOrderDetailBaseInformation>

/** Delivery and billing address match, so one merged box spans the full width. */
export const SameAddress: Story = {
  args: {
    order: createMockOrder(),
  },
}

/** Delivery and billing address differ, so each gets its own box. */
export const DifferentAddresses: Story = {
  args: {
    order: createMockOrder({ address: separateAddresses }),
  },
}

/** The order date could not be formatted, so its row is left out. */
export const NoConfirmationDate: Story = {
  args: {
    order: createMockOrder({ confirmedAt: '' }),
  },
}
