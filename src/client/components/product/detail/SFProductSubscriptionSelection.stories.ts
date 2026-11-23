import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { PreferredDeliveryDate } from '@shared/types/Subscription'
import SFProductSubscriptionSelection from './SFProductSubscriptionSelection.vue'

const intervals = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Every 2 Weeks', value: 'bi-weekly' },
  { label: 'Weekly', value: 'weekly' },
]

const preferredDeliveryDays: PreferredDeliveryDate[] = [
  { day: 1, label: '1st of the month' },
  { day: 15, label: '15th of the month' },
  { day: 20, label: '20th of the month' },
]

/**
 * SFProductSubscriptionSelection allows users to select a subscription interval
 * and preferred delivery day. Displays two dropdowns and an "Add to Basket" button.
 * Integrates with v-model for selectedInterval and selectedDeliveryDay.
 */
export default {
  title: 'Product/Detail/SFProductSubscriptionSelection',
  component: SFProductSubscriptionSelection,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFProductSubscriptionSelection>,
  ) => ({
    components: { SFProductSubscriptionSelection },
    setup() {
      return { args }
    },
    template: `<div class="max-w-md"><SFProductSubscriptionSelection v-bind="args" /></div>`,
  }),
  argTypes: {
    intervals: { control: false },
    preferredDeliveryDays: { control: false },
  },
} satisfies Meta<typeof SFProductSubscriptionSelection>

type Story = StoryObj<typeof SFProductSubscriptionSelection>

/**
 * Default state with interval and delivery day options available.
 */
export const Default: Story = {
  args: {
    intervals,
    preferredDeliveryDays,
    disabled: false,
  },
}

/**
 * Disabled state with a reason explaining why the selection is unavailable.
 */
export const Disabled: Story = {
  args: {
    intervals,
    preferredDeliveryDays,
    disabled: true,
    disabledReason: 'This product is sold out.',
  },
}
