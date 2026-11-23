import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { usePage } from '@inertiajs/vue3'
import { mocked } from 'storybook/test'
import type {
  VariantPrice,
  Campaign,
  Promotion,
} from '@scayle/storefront/types'
import SFPriceInfoModal from './SFPriceInfoModal.vue'

const price: VariantPrice = {
  finalPrice: '€27.01',
  originalPrice: '€34.90',
  finalPriceInCents: 2701,
  originalPriceInCents: 3490,
  currency: 'EUR',
  isOnSale: true,
  totalReduction: '-10%',
  showOriginally: true,
  showLowestPriorPriceLine: true,
  strikeOriginally: true,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: true,
  saleReduction: '€3.49',
  saleReductionInCents: 349,
  campaignReduction: '€4.40',
  campaignReductionInCents: 440,
  promotionReduction: '€0.00',
  lowestPriorPrice: { withTax: '€24.90' },
  tax: { amount: '€4.31', amountInCents: 431, rate: '19%' },
  strikeThroughPrices: [
    {
      value: '-10%',
      category: 'sale',
      type: 'relative',
      originalPrice: '€34.90',
    },
  ],
}

const campaign: Campaign = {
  id: 'summer',
  key: 'summer',
  name: 'Summer Deal',
  reduction: 0,
  schedule: { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
  headline: 'Summer Deal',
  subline: '',
  link: '',
  hideCountdown: true,
  color: { backgroundColor: '#ffc65f', color: '#171717' },
  conditions: '',
}

const promotion: Promotion = {
  id: 'flash',
  name: 'Flash Sale',
  priority: 1,
  headline: 'Flash Sale',
  link: '/promo/flash',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#5328e1', color: '#ffffff' },
  schedule: { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
}

/**
 * Price Information modal: explains the price breakdown (current cost, original
 * price, last lowest price, and per-discount reductions) for a discounted
 * product. Campaign and promotion rows come from Inertia shared page data.
 */
export default {
  title: 'Product/SFPriceInfoModal',
  component: SFPriceInfoModal,
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, campaign },
    })
  },
  args: {
    price,
    promotions: [promotion],
    open: true,
  },
} satisfies Meta<typeof SFPriceInfoModal>

type Story = StoryObj<typeof SFPriceInfoModal>

/** Fully discounted product with sale, campaign, and promotion rows. */
export const Default = {} satisfies Story
