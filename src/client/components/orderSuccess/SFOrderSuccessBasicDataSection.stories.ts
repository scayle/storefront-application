import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import {
  createMockOrder,
  separateAddresses,
} from '../../../test/mock-data/orders'
import SFOrderSuccessBasicDataSection from './SFOrderSuccessBasicDataSection.vue'

/**
 * SFOrderSuccessBasicDataSection is the left column of the order success page.
 * It composes the page title, greeting box, order data grid (order details,
 * payment, addresses), and desktop CTA buttons.
 */
export default {
  title: 'Order Success/SFOrderSuccessBasicDataSection',
  component: SFOrderSuccessBasicDataSection,
  parameters: { layout: 'fullscreen' },
  render: (
    args: ComponentPropsAndSlots<typeof SFOrderSuccessBasicDataSection>,
  ) => ({
    components: { SFOrderSuccessBasicDataSection },
    setup() {
      return { args }
    },
    template: `<SFOrderSuccessBasicDataSection v-bind="args" />`,
  }),
} satisfies Meta<typeof SFOrderSuccessBasicDataSection>

type Story = StoryObj<typeof SFOrderSuccessBasicDataSection>

/**
 * Default left column with single address (shipping = billing).
 */
export const Default: Story = {
  args: {
    order: createMockOrder(),
  },
}

/**
 * Left column where shipping and billing addresses differ.
 */
export const SeparateAddresses: Story = {
  args: {
    order: createMockOrder({
      address: separateAddresses,
    }),
  },
}
