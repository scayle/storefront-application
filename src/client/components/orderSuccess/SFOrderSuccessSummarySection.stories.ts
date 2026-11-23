import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import {
  createMockOrder,
  createMockOrderDelivery,
  createMockOrderItem,
} from '../../../test/mock-data/orders'
import SFOrderSuccessSummarySection from './SFOrderSuccessSummarySection.vue'

/**
 * SFOrderSuccessSummarySection is the right column of the order success page.
 * It shows the order number headline, delivery groups with date ranges and
 * product cards, and the payment summary at the bottom.
 */
export default {
  title: 'Order Success/SFOrderSuccessSummarySection',
  component: SFOrderSuccessSummarySection,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFOrderSuccessSummarySection>,
  ) => ({
    components: { SFOrderSuccessSummarySection },
    setup() {
      return { args }
    },
    template: `<SFOrderSuccessSummarySection v-bind="args" />`,
  }),
} satisfies Meta<typeof SFOrderSuccessSummarySection>

type Story = StoryObj<typeof SFOrderSuccessSummarySection>

/**
 * Default summary with one delivery containing two items.
 */
export const Default: Story = {
  args: {
    order: createMockOrder(),
  },
}

/**
 * Multiple deliveries: items split across two packages with different carriers.
 */
export const MultipleDeliveries: Story = {
  args: {
    order: createMockOrder({
      deliveries: [
        createMockOrderDelivery({
          id: 1,
          carrierKey: 'DHL_STD_NATIONAL',
          items: [createMockOrderItem()],
        }),
        createMockOrderDelivery({
          id: 2,
          carrierKey: 'HERMES_STD_NATIONAL',
          deliveryDate: { minimum: '29/03/2026', maximum: '02/04/2026' },
          items: [createMockOrderItem({ id: 3, packageId: 2 })],
        }),
      ],
    }),
  },
}
