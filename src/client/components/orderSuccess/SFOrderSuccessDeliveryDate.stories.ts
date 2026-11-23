import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { createMockOrderDelivery } from '../../../test/mock-data/orders'
import SFOrderSuccessDeliveryDate from './SFOrderSuccessDeliveryDate.vue'

/**
 * SFOrderSuccessDeliveryDate displays the expected delivery date range and carrier
 * for a single delivery package on the order success page.
 *
 * Delivery dates are pre-formatted by the server mapper so the component
 * renders them as-is.
 */
export default {
  title: 'Order Success/SFOrderSuccessDeliveryDate',
  component: SFOrderSuccessDeliveryDate,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFOrderSuccessDeliveryDate>,
  ) => ({
    components: { SFOrderSuccessDeliveryDate },
    setup() {
      return { args }
    },
    template: `<div class="max-w-112"><SFOrderSuccessDeliveryDate v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderSuccessDeliveryDate>

type Story = StoryObj<typeof SFOrderSuccessDeliveryDate>

/**
 * Default delivery date with DHL carrier.
 */
export const Default: Story = {
  args: {
    delivery: createMockOrderDelivery(),
  },
}

/**
 * Delivery with a different carrier (Hermes) and a later date range.
 */
export const DifferentCarrier: Story = {
  args: {
    delivery: createMockOrderDelivery({
      carrierKey: 'DEFAULT',
      deliveryDate: { minimum: '27/03/2026', maximum: '01/04/2026' },
    }),
  },
}
