import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import { usePage } from '@inertiajs/vue3'
import { mocked } from 'storybook/test'
import type {
  ProductPrice,
  VariantPrice,
  Campaign,
  Promotion,
} from '@scayle/storefront/types'
import { Size } from '@client/utils/constants'
import SFProductPrice from './SFProductPrice.vue'

/** Sizes with distinct typography in `SFProductPrice` (`xl` is treated as `lg`). */
const PRODUCT_PRICE_SIZES = [Size.SM, Size.MD, Size.LG] as const

const basePrice: VariantPrice = {
  finalPrice: '€49.00',
  originalPrice: '€49.00',
  finalPriceInCents: 4900,
  originalPriceInCents: 4900,
  currency: 'EUR',
  strikeThroughPrices: [],
  isOnSale: false,
  showOriginally: false,
  showLowestPriorPriceLine: false,
  strikeOriginally: false,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
}

const priceFrom: ProductPrice = {
  ...basePrice,
  hasDifferentPrices: true,
}

const priceOnSale: VariantPrice = {
  finalPrice: '€39.20',
  originalPrice: '€49.00',
  finalPriceInCents: 3920,
  originalPriceInCents: 4900,
  currency: 'EUR',
  isOnSale: true,
  totalReduction: '-20%',
  showOriginally: true,
  showLowestPriorPriceLine: false,
  strikeOriginally: true,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  saleReduction: '€9.80',
  strikeThroughPrices: [
    {
      value: '-20%',
      category: 'sale',
      type: 'relative',
      originalPrice: '€49.00',
    },
  ],
}

const promotion: Promotion = {
  id: 'promo-1',
  name: 'Summer Sale',
  priority: 1,
  headline: 'Summer Sale',
  link: '/promo/summer',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#F0F0F0', color: '#000000' },
  schedule: { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
}

const storyCampaign: Campaign = {
  id: 'story-campaign',
  key: 'story-campaign',
  name: 'Story campaign',
  reduction: 0,
  schedule: { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
  headline: '',
  subline: '',
  link: '',
  hideCountdown: true,
  color: { backgroundColor: '#1a237e', color: '#ffffff' },
  conditions: '',
}

const priceWithEveryReduction: VariantPrice = {
  finalPrice: '€39.20',
  originalPrice: '€49.00',
  finalPriceInCents: 3920,
  originalPriceInCents: 4900,
  currency: 'EUR',
  isOnSale: true,
  totalReduction: '-20%',
  showOriginally: true,
  showLowestPriorPriceLine: true,
  strikeOriginally: false,
  strikeLowestPriorPrice: true,
  hasCampaignReduction: true,
  saleReduction: '€10.00',
  campaignReduction: '€6.00',
  promotionReduction: '€3.80',
  lowestPriorPrice: { withTax: '€45.00' },
  tax: { amount: '€6.26', amountInCents: 626, rate: '19%' },
  strikeThroughPrices: [
    {
      value: '-20%',
      category: 'campaign',
      type: 'relative',
      originalPrice: '€49.00',
    },
    {
      value: '-10€',
      category: 'promotion',
      type: 'absolute',
      originalPrice: '€60.00',
      promotionId: 'promo-1',
    },
    {
      value: '-10€',
      category: 'sale',
      type: 'absolute',
      originalPrice: '€70.00',
    },
  ],
}

const mockPageProps = (props: Record<string, unknown>) => ({
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, ...props },
    })
  },
})

/**
 * Labeled price display: final price (red when discounted, "from" prefix when
 * variant prices differ), an "Originally:" row, and an optional 30-day
 * "last lowest price" row. When discounted with tax info shown, the row becomes
 * clickable and opens the Price Information modal. Use controls to try `inline`,
 * sizes, and the modifier flags.
 */
export default {
  title: 'Product/SFProductPrice',
  component: SFProductPrice,
  parameters: { layout: 'centered' },
  args: {
    size: Size.MD,
    inline: true,
    showTaxInfo: false,
    showLowestPriorPrice: false,
    showStrikeThroughPrice: false,
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: [...PRODUCT_PRICE_SIZES],
    },
    price: { control: false },
    inline: { control: 'boolean' },
    showTaxInfo: { control: 'boolean' },
    showLowestPriorPrice: { control: 'boolean' },
    showStrikeThroughPrice: { control: 'boolean' },
  },
  render: (args: ComponentPropsAndSlots<typeof SFProductPrice>) => ({
    components: { SFProductPrice },
    setup() {
      return { args }
    },
    template: `<SFProductPrice v-bind="args" />`,
  }),
} satisfies Meta<typeof SFProductPrice>

type Story = StoryObj<typeof SFProductPrice>

/** Plain price, no reductions — final price in primary colour. */
export const Default = {
  args: { price: basePrice },
} satisfies Story

/** Discounted: red final price with the "Originally:" row beneath. */
export const OnSale = {
  args: { price: priceOnSale },
} satisfies Story

/**
 * Discounted PDP price with tax info — the row is clickable and opens the Price
 * Information modal, whose campaign/promotion rows come from shared page data.
 */
export const WithPriceInfoModal = {
  ...mockPageProps({
    promotions: [promotion],
    campaign: storyCampaign,
  }),
  args: {
    price: priceWithEveryReduction,
    size: Size.LG,
    showTaxInfo: true,
    showLowestPriorPrice: true,
  },
} satisfies Story

/** "From" prefix when variant prices differ. */
export const WithPriceFrom = {
  args: { price: priceFrom },
} satisfies Story

/** Last lowest price (30 days) row, shown when discounted. */
export const WithLowestPriorPrice = {
  args: {
    price: {
      ...priceOnSale,
      lowestPriorPrice: {
        withTax: '€45.00',
      },
    },
    showLowestPriorPrice: true,
  },
} satisfies Story

/** Stacked, right-aligned layout for basket line items. */
export const MultiLine = {
  args: {
    price: priceOnSale,
    inline: false,
    showTaxInfo: true,
  },
} satisfies Story
