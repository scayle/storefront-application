import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import {
  defaultAddresses,
  separateAddresses,
} from '../../../test/mock-data/orders'
import SFOrderSuccessAddressInfo from './SFOrderSuccessAddressInfo.vue'

/**
 * SFOrderSuccessAddressInfo displays shipping and billing addresses on the order success page.
 * When both addresses are the same, a single "Delivery & billing address" box is shown.
 * When they differ, two separate boxes are rendered.
 *
 * Address lines are pre-formatted by the server mapper.
 */
export default {
  title: 'Order Success/SFOrderSuccessAddressInfo',
  component: SFOrderSuccessAddressInfo,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFOrderSuccessAddressInfo>) => ({
    components: { SFOrderSuccessAddressInfo },
    setup() {
      return { args }
    },
    template: `
      <div class="grid max-w-160 grid-cols-2 gap-4">
        <SFOrderSuccessAddressInfo v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFOrderSuccessAddressInfo>

type Story = StoryObj<typeof SFOrderSuccessAddressInfo>

/**
 * Single address: shipping and billing are the same location.
 * Renders one box spanning the full width with "Delivery & billing address" title.
 */
export const SingleAddress: Story = {
  args: {
    address: defaultAddresses,
  },
}

/**
 * Separate addresses: shipping and billing differ.
 * Renders two side-by-side boxes.
 */
export const SeparateAddresses: Story = {
  args: {
    address: separateAddresses,
  },
}
