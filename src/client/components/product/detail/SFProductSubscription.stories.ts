import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { ProductVariant } from '@scayle/storefront/types'
import { createMockDetailedProduct } from '@/test/mock-data/products'
import SFProductSubscription from './SFProductSubscription.vue'

const product = createMockDetailedProduct()

/**
 * Variant eligible for subscription, with intervals and term/cancellation policy.
 */
const variantEligible: ProductVariant = {
  id: 1,
  label: 'M',
  stock: 10,
  isLowStock: false,
  isSoldOut: false,
  price: {
    finalPrice: '€9.99',
    originalPrice: '€12.99',
    currency: 'EUR',
    finalPriceInCents: 999,
    originalPriceInCents: 1299,
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
    strikeThroughPrices: [],
  },
  subscription: {
    intervals: [
      { label: 'Monthly', value: '1_month' },
      { label: 'Weekly', value: 'weekly' },
    ],
    term: 'No_minimum_term',
    cancellationPolicy: 'Immediate_cancellation',
  },
}

/**
 * Variant not eligible for subscription.
 */
const variantNotEligible: ProductVariant = {
  ...variantEligible,
  subscription: undefined,
}

/**
 * SFProductSubscription displays subscription options for a selected product variant.
 * Shows subscription eligibility, pricing, and interval/delivery-day selection.
 * Uses variant.subscription to determine eligibility and intervals.
 */
export default {
  title: 'Product/Detail/SFProductSubscription',
  component: SFProductSubscription,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductSubscription>) => ({
    components: { SFProductSubscription },
    setup() {
      return { args }
    },
    template: `<div class="max-w-md"><SFProductSubscription v-bind="args" /></div>`,
  }),
  argTypes: {
    product: { control: false },
    variant: { control: false },
    quantity: { control: 'number' },
  },
} satisfies Meta<typeof SFProductSubscription>

type Story = StoryObj<typeof SFProductSubscription>

/**
 * Eligible variant with subscription options available.
 */
export const Default: Story = {
  args: {
    product,
    variant: variantEligible,
    quantity: 1,
  },
}

/**
 * No variant selected; prompts user to select a size/variant first.
 */
export const NoVariantSelected: Story = {
  args: {
    product,
    variant: undefined,
    quantity: 1,
  },
}

/**
 * Variant not eligible for subscription; shows ineligible message.
 */
export const NotEligible: Story = {
  args: {
    product,
    variant: variantNotEligible,
    quantity: 1,
  },
}
