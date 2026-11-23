import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'

import type { Basket, Campaign } from '@scayle/storefront/types'

import SFBasketSummary from './SFBasketSummary.vue'

const basketWithVat: Basket = {
  availableItems: [],
  unavailableItems: [],
  itemCount: 0,
  promotionCodes: [],
  giftPromotions: [],
  cost: {
    finalPrice: '€20.00',
    finalPriceInCents: 2000,
    finalPriceWithoutTaxInCents: 1681,
    subtotal: '€25.00',
    totalWithoutPromotionsInCents: 2500,
    saleAndVoucherReductions: [],
    saleReductionSumInCents: 0,
    campaignReductionSumInCents: 0,
    promotionReductionSumInCents: 0,
    hasCampaignReduction: false,
    hasReductions: false,
    tax: {
      amount: '€3.19',
      amountInCents: 319,
      rate: '19%',
    },
    currency: 'EUR',
    promotionReductionsPerPromotion: [],
  },
}

const basketWithoutVat: Basket = {
  ...basketWithVat,
  cost: {
    ...basketWithVat.cost,
    tax: undefined,
  },
}

const promotionReduction = {
  id: '1',
  name: 'Promotion 1',
  headline: 'Promotion 1',
  color: { backgroundColor: '#111', color: '#fff' },
  total: '€10.00',
  totalInCents: 1000,
}

const basketWithPromotions: Basket = {
  ...basketWithVat,
  cost: {
    ...basketWithVat.cost,
    promotionReductionsPerPromotion: [promotionReduction],
    promotionReductionSumInCents: 1000,
    hasReductions: true,
  },
}

const basketWithCampaign: Basket = {
  ...basketWithVat,
  cost: {
    ...basketWithVat.cost,
    campaignReductionSumInCents: 1000,
    hasCampaignReduction: true,
    hasReductions: true,
  },
}

const basketWithAllReductions: Basket = {
  ...basketWithVat,
  cost: {
    ...basketWithVat.cost,
    saleAndVoucherReductions: [
      {
        category: 'voucher',
        type: 'absolute',
        amount: '€10.00',
        amountInCents: 1000,
      },
      {
        category: 'sale',
        type: 'absolute',
        amount: '€10.00',
        amountInCents: 1000,
      },
    ],
    saleReductionSumInCents: 1000,
    campaignReductionSumInCents: 1000,
    hasCampaignReduction: true,
    promotionReductionsPerPromotion: [promotionReduction],
    promotionReductionSumInCents: 1000,
    hasReductions: true,
  },
}
/**
 * SFBasketSummary shows the basket subtotal, delivery fees from shared props
 * (Panel shop custom data or server fallback), optional reductions, and the final
 * price with VAT status.
 */
export default {
  title: 'Basket/SFBasketSummary',
  component: SFBasketSummary,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFBasketSummary>) => ({
    components: { SFBasketSummary },
    setup() {
      return { args }
    },
    template: '<SFBasketSummary v-bind="args" />',
  }),
} satisfies Meta<typeof SFBasketSummary>

type Story = StoryObj<typeof SFBasketSummary>

/**
 * Basket summary example where VAT is included
 */
export const WithVat: Story = {
  args: {
    basket: basketWithVat,
    deliveryCosts: {
      value: 'from €4.99',
      disclaimer:
        '* Delivery fees will be determined during checkout after you choose a preferred delivery option.',
    },
  },
}

/**
 * Basket summary example where VAT is excluded
 */
export const WithoutVat: Story = {
  args: {
    basket: basketWithoutVat,
    deliveryCosts: {
      value: 'ab 0,00 €',
      disclaimer:
        '* Delivery fees will be determined during checkout after you choose a preferred delivery option.',
    },
  },
}

/**
 * Basket summary example where VAT is excluded
 */
export const WithPromotions: Story = {
  args: {
    basket: basketWithPromotions,
    deliveryCosts: {
      value: 'ab 0,00 €',
      disclaimer:
        '* Delivery fees will be determined during checkout after you choose a preferred delivery option.',
    },
  },
}

export const WithCampaign: Story = {
  args: {
    basket: basketWithCampaign,
    deliveryCosts: {
      value: 'ab 0,00 €',
      disclaimer:
        '* Delivery fees will be determined during checkout after you choose a preferred delivery option.',
    },
    campaign: {
      id: '1',
      name: 'Campaign 1',
      headline: 'Campaign 1',
      subline: 'Campaign 1',
      link: '#',
      hideCountdown: false,
      color: { backgroundColor: '#FFE4E6', color: '#991B1B' },
    } as Campaign,
  },
}

export const WithAllReductions: Story = {
  args: {
    basket: basketWithAllReductions,
    deliveryCosts: {
      value: 'ab 0,00 €',
      disclaimer:
        '* Delivery fees will be determined during checkout after you choose a preferred delivery option.',
    },
    campaign: {
      id: '1',
      name: 'Campaign 1',
      headline: 'Campaign 1',
      subline: 'Campaign 1',
      link: '#',
      hideCountdown: false,
      color: { backgroundColor: '#FFE4E6', color: '#991B1B' },
    } as Campaign,
  },
}
