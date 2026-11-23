import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { createMockOrder } from '../../../../../test/mock-data/orders'
import SFOrderDetailHeadline from './SFOrderDetailHeadline.vue'

const { id, status } = createMockOrder()

/**
 * SFOrderDetailHeadline opens the account order detail page: a back link to the
 * order list, the order number, and the status badge.
 */
export default {
  title: 'Account/Orders/Detail/SFOrderDetailHeadline',
  component: SFOrderDetailHeadline,
  parameters: { layout: 'centered' },
  args: { id, status },
  render: (args: ComponentPropsAndSlots<typeof SFOrderDetailHeadline>) => ({
    components: { SFOrderDetailHeadline },
    setup() {
      return { args }
    },
    template: `<div class="w-[640px] max-w-full"><SFOrderDetailHeadline v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFOrderDetailHeadline>

type Story = StoryObj<typeof SFOrderDetailHeadline>

/** Headline of a confirmed order. */
export const Default: Story = {}
