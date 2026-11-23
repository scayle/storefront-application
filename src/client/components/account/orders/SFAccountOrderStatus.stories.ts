import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { orderStatuses } from '../../../../test/mock-data/orders'
import SFAccountOrderStatus from './SFAccountOrderStatus.vue'

/**
 * SFAccountOrderStatus is the status badge on the account order card
 * (`SFAccountOrderCard`) and the order detail headline (`SFOrderDetailHeadline`).
 * Several order statuses share one badge, so there is one story per badge and
 * the status control lists every status. A value outside `OrderStatus` falls
 * back to a gray badge with the raw value, which has no story because no typed
 * arg can reach it. The muted `disabled` badge only fails color contrast on its
 * own, so it is shown in the `SFAccountOrderCard` Disabled story, whose link
 * marks the card inactive.
 */
export default {
  title: 'Account/Orders/SFAccountOrderStatus',
  component: SFAccountOrderStatus,
  parameters: { layout: 'centered' },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: orderStatuses,
    },
  },
  args: { status: 'order_open' },
} satisfies Meta<typeof SFAccountOrderStatus>

type Story = StoryObj<typeof SFAccountOrderStatus>

/** Order placed and waiting for payment. */
export const Open: Story = {}

/** Payment reserved, or part of the order invoiced. */
export const Confirmed: Story = {
  args: { status: 'payment_reserved' },
}

/** Order fully invoiced and shipped. */
export const Shipped: Story = {
  args: { status: 'invoice_completed' },
}

/** Order cancelled, or its cancellation pending. */
export const Cancelled: Story = {
  args: { status: 'cancellation_completed' },
}
