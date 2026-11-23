import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { orderStatuses } from '../../../../test/mock-data/orders'
import SFAccountOrderCard from './SFAccountOrderCard.vue'

/** Formats Storybook date control values for the card display string. */
function formatConfirmedAt(
  value: number | string | undefined,
): string | undefined {
  if (value == null || value === '') {
    return undefined
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : undefined
  }
  return date.toLocaleDateString('en-US')
}

type SFAccountOrderCardStoryArgs = Omit<
  ComponentPropsAndSlots<typeof SFAccountOrderCard>,
  'confirmedAt'
> & {
  /** Storybook date control (ms since epoch). Formatted in `render`. */
  confirmedAt?: number | string
}

/**
 * Order card for the account orders list (Figma: Order Card).
 * The whole card is one link. The trailing chevron CTA is decorative.
 * Use **status** and **confirmedAt** in Controls to preview variants.
 */
export default {
  title: 'Account/Orders/SFAccountOrderCard',
  component: SFAccountOrderCard,
  parameters: { layout: 'centered' },
  argTypes: {
    id: { control: 'number' },
    confirmedAt: {
      control: { type: 'date' },
    },
    itemCount: { control: 'number' },
    status: {
      control: { type: 'select' },
      options: orderStatuses,
    },
    disabled: { control: 'boolean' },
  },
  args: {
    id: 1337,
    status: 'payment_reserved',
    confirmedAt: new Date('2026-03-14').getTime(),
    itemCount: 5,
    disabled: false,
  },
  render: (args: SFAccountOrderCardStoryArgs) => ({
    components: { SFAccountOrderCard },
    setup() {
      const cardArgs = {
        ...args,
        confirmedAt: formatConfirmedAt(args.confirmedAt),
      }
      return { cardArgs }
    },
    template: `
      <div class="w-[640px] max-w-full">
        <SFAccountOrderCard v-bind="cardArgs" />
      </div>
    `,
  }),
} satisfies Meta<SFAccountOrderCardStoryArgs>

type Story = StoryObj<SFAccountOrderCardStoryArgs>

const pdfSample = {
  id: 1337,
  status: 'payment_reserved' as const,
  confirmedAt: new Date('2026-03-14').getTime(),
  itemCount: 5,
}

/** Default enabled card. Use **status** and **confirmedAt** in Controls. */
export const Enabled: Story = {
  args: pdfSample,
}

/** Disabled card: white shell, muted border/text/CTA. Not wired from API yet. */
export const Disabled: Story = {
  args: {
    ...pdfSample,
    disabled: true,
  },
}

/** Multiple order cards as on the account orders page. */
export const OrderCardList: Story = {
  render: () => ({
    components: { SFAccountOrderCard },
    template: `
      <div class="w-[640px] max-w-full space-y-6">
        <SFAccountOrderCard
          :id="1337"
          status="payment_reserved"
          confirmed-at="3/14/2026"
          :item-count="5"
        />
        <SFAccountOrderCard
          :id="1002"
          status="invoice_completed"
          confirmed-at="2/20/2026"
          :item-count="3"
        />
        <SFAccountOrderCard
          :id="1003"
          status="order_open"
          confirmed-at="1/10/2026"
          :item-count="2"
        />
      </div>
    `,
  }),
}
