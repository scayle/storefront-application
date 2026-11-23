import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFOrderDetailSubscriptionNotice from './SFOrderDetailSubscriptionNotice.vue'

/**
 * SFOrderDetailSubscriptionNotice tells the customer that the order holds a
 * subscription item and links to their subscriptions. The account order detail
 * page shows it only when an order item has a subscription.
 */
export default {
  title: 'Account/Orders/Detail/SFOrderDetailSubscriptionNotice',
  component: SFOrderDetailSubscriptionNotice,
  parameters: { layout: 'centered' },
  render: () => ({
    components: { SFOrderDetailSubscriptionNotice },
    template: `<div class="w-[640px] max-w-full"><SFOrderDetailSubscriptionNotice /></div>`,
  }),
} satisfies Meta<typeof SFOrderDetailSubscriptionNotice>

type Story = StoryObj<typeof SFOrderDetailSubscriptionNotice>

/** Notice with the link to the subscriptions page. */
export const Default: Story = {}
