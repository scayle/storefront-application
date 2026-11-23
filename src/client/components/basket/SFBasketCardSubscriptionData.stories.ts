import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFBasketCardSubscriptionData from './SFBasketCardSubscriptionData.vue'

/**
 * SFBasketCardSubscriptionData displays the subscription interval and follow-up
 * delivery of a basket or order item as label/value pairs. The interval label
 * comes from the variant's interval options; without them the stored value is
 * shown as-is. Renders nothing without a subscription definition.
 */
export default {
  title: 'Basket/SFBasketCardSubscriptionData',
  component: SFBasketCardSubscriptionData,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFBasketCardSubscriptionData>,
  ) => ({
    components: { SFBasketCardSubscriptionData },
    setup() {
      return { args }
    },
    template: `<div class="max-w-md"><SFBasketCardSubscriptionData v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFBasketCardSubscriptionData>

type Story = StoryObj<typeof SFBasketCardSubscriptionData>

/**
 * A basket item bought as a subscription, with the interval label resolved from
 * the variant's interval options.
 */
export const Default: Story = {
  args: {
    definition: {
      subscriptionInterval: 'monthly',
      subscriptionDeliveryDate: '1',
      subscriptionTerm: 'No_minimum_term',
      subscriptionCancellationPolicy: 'Can_cancel_anytime',
    },
    subscription: {
      intervals: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Every 3 months', value: 'quarterly' },
      ],
      term: 'No_minimum_term',
      cancellationPolicy: 'Can_cancel_anytime',
    },
  },
}

/**
 * An order item, whose stripped variant carries no interval options, so the raw
 * stored interval value is shown.
 */
export const WithoutVariantIntervals: Story = {
  args: {
    definition: {
      subscriptionInterval: 'monthly',
      subscriptionDeliveryDate: '15',
    },
  },
}

/**
 * A regular item without a subscription definition; the component renders
 * nothing.
 */
export const Empty: Story = {
  args: {},
}
