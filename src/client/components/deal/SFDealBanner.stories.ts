import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { computed } from 'vue'
import { mocked } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { StorefrontCountry } from '@scayle/storefront/config'
import type {
  Promotion,
  Basket,
  BasketItem,
  BuyXGetYEffect,
} from '@scayle/storefront/types'
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from '@client/utils/time'
import { createMockListingProduct } from '../../../test/mock-data/products'
import SFDealBanner from './SFDealBanner.vue'

type StoryProps = ComponentPropsAndSlots<typeof SFDealBanner> & {
  textColor?: string
  backgroundColor?: string
  expirationDate?: string
}

const expirationDate = new Date(
  Date.now() + 2 * DAY_MS + 5 * HOUR_MS + 30 * MINUTE_MS + 45 * SECOND_MS,
).toISOString() // 2 days, 5 hours, 30 minutes, 45 seconds

const urgentExpirationDate = new Date(
  Date.now() + 5 * HOUR_MS + 30 * MINUTE_MS + 15 * SECOND_MS,
).toISOString() // 5 hours, 30 minutes, 15 seconds

/** Base deal with tiers so SFPromotionProgressWrapper is rendered (tiered promotion). */
const tieredDealBase = {
  id: '3',
  name: 'Tiered Spend & Save',
  headline: 'Spend more, save more',
  subline: 'Get -10% at $100, -15% at $150, -20% at $200.',
  conditions: 'Add eligible products to your basket.',
  hideCountdown: false,
  schedule: {
    from: new Date(Date.now()).toISOString(),
    to: expirationDate,
  },
  color: {
    backgroundColor: '#c8e6c9',
    color: '#171717',
  },
  tiers: [
    {
      id: 1,
      name: 'Tier 1',
      mov: 5000,
      effect: {
        type: 'automatic_discount',
        discountType: 'relative',
        value: '10',
      },
    },
    {
      id: 2,
      name: 'Tier 2',
      mov: 10000,
      effect: {
        type: 'automatic_discount',
        discountType: 'relative',
        value: '15',
      },
    },
    {
      id: 3,
      name: 'Tier 3',
      mov: 15000,
      effect: {
        type: 'automatic_discount',
        discountType: 'relative',
        value: '20',
      },
    },
  ],
} as unknown as Promotion

const country: StorefrontCountry = {
  name: 'United States',
  locale: 'en-US',
  currency: { currencyCode: 'USD' },
  countryCode: 'US',
  shopCountryId: 1,
  domain: 'example.com',
  path: '/en',
  checkout: {
    token: 'test',
    secret: 'test',
    user: 'test',
  },
}

const variantPrice = {
  finalPrice: '$9.99',
  originalPrice: '$12.99',
  finalPriceInCents: 999,
  originalPriceInCents: 1299,
  currency: 'EUR',
  strikeThroughPrices: [],
  isOnSale: false,
  showOriginally: false,
  showLowestPriorPriceLine: false,
  strikeOriginally: false,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
}

const baseBasketItem: BasketItem = {
  key: 'item-1',
  variants: [],
  promotions: [],
  quantity: 1,
  availableQuantity: 10,
  isLowStock: false,
  status: 'available',
  unitPrice: variantPrice,
  totalPrice: { ...variantPrice, appliedReductions: [] },
  product: createMockListingProduct({ id: 1, images: [], siblings: [] }),
  variant: {
    id: 1,
    label: 'M',
    stock: 10,
    isLowStock: false,
    isSoldOut: false,
    price: variantPrice,
  },
  customData: {},
}

/** Tiered promotion applied to a basket item (matches tieredDealBase.id). */
const tieredPromotionOnItem = {
  id: '3',
  name: tieredDealBase.name,
  color: tieredDealBase.color,
} as unknown as Promotion

/**
 * Basket cost with no reductions at the given total. `useMOVPromotions` reads
 * `totalWithoutPromotionsInCents` to decide how far the basket is from a tier.
 */
function createBasketCost(
  totalInCents: number,
  formattedTotal: string,
  overrides: Partial<Basket['cost']> = {},
): Basket['cost'] {
  return {
    finalPrice: formattedTotal,
    finalPriceInCents: totalInCents,
    finalPriceWithoutTaxInCents: totalInCents,
    subtotal: formattedTotal,
    totalWithoutPromotionsInCents: totalInCents,
    saleAndVoucherReductions: [],
    saleReductionSumInCents: 0,
    campaignReductionSumInCents: 0,
    promotionReductionSumInCents: 0,
    hasCampaignReduction: false,
    hasReductions: false,
    currency: variantPrice.currency,
    promotionReductionsPerPromotion: [],
    ...overrides,
  }
}

/**
 * Basket with total below first tier ($50). useMOVPromotions shows remaining minimum order value.
 */
const basketRemainingMOV: Basket = {
  availableItems: [{ ...baseBasketItem }],
  unavailableItems: [],
  itemCount: 1,
  promotionCodes: [],
  giftPromotions: [],
  cost: createBasketCost(0, '$0.00'),
}

/**
 * Basket above first tier ($60) but promotion not applied on items. Shows fulfilled promotion condition.
 */
const basketFulfilledCondition: Basket = {
  availableItems: [{ ...baseBasketItem }],
  unavailableItems: [],
  itemCount: 1,
  promotionCodes: [],
  giftPromotions: [],
  cost: createBasketCost(6000, '$60.00'),
}

/**
 * Basket at second tier ($120), promotion applied. Shows partial savings.
 */
const basketPartialSavings: Basket = {
  itemCount: 1,
  availableItems: [
    {
      ...baseBasketItem,
      promotions: [tieredPromotionOnItem],
    },
  ],
  unavailableItems: [],
  promotionCodes: [],
  giftPromotions: [],
  cost: createBasketCost(12000, '$120.00', {
    promotionReductionSumInCents: 1800,
    hasReductions: true,
  }),
}

/**
 * Basket at max tier ($150), promotion applied. Shows full savings.
 */
const basketFullSavings: Basket = {
  itemCount: 1,
  availableItems: [
    {
      ...baseBasketItem,
      promotions: [tieredPromotionOnItem],
    },
  ],
  unavailableItems: [],
  promotionCodes: [],
  giftPromotions: [],
  cost: createBasketCost(15000, '$150.00', {
    promotionReductionSumInCents: 3000,
    hasReductions: true,
  }),
}

/** Minimal storefront for useMOVPromotions (formatCurrency needs country). */
const storefrontForMOV = { storefront: { country } }

/**
 * SFDealBanner displays promotional messages and offers for products.
 * It supports various promotion types and customizable styling to match different marketing campaigns.
 *
 * Key features:
 * - Support for different promotion types (automatic discounts, buy X get Y)
 * - Customizable colors for text and background
 * - Optional condition text display
 */
export default {
  title: 'Deal/SFDealBanner',
  component: SFDealBanner,
  args: {
    placement: { component_type: 'pdp_banner', position: 1, total: 1 },
  },
  argTypes: {
    textColor: {
      control: 'color',
      description:
        'Custom text color for the banner. Use this to ensure readability against the background color.',
    },
    backgroundColor: {
      control: 'color',
      description:
        'Custom background color for the banner. Choose colors that align with your brand and campaign theme.',
    },
    expirationDate: {
      control: 'date',
      description:
        'Custom expiration date for the banner. Use this to override the default expiration date.',
    },
  },
  render: (args: StoryProps) => {
    return {
      components: { SFDealBanner },
      setup() {
        const colorStyle = computed(() => ({
          backgroundColor:
            args.backgroundColor || args.deal?.color?.backgroundColor,
          textColor: args.textColor || args.deal?.color?.color,
          color: args.textColor || args.deal?.color?.color,
        }))

        const schedule = computed(() => {
          return {
            from: new Date(Date.now()).toISOString(),
            to: args.expirationDate
              ? new Date(args.expirationDate).toISOString()
              : args.deal?.schedule?.to,
          }
        })

        return { args, colorStyle, schedule }
      },
      template:
        '<SFDealBanner v-bind="args" :deal="{...args.deal, color: colorStyle, schedule: schedule}" />',
    }
  },
} satisfies Meta<StoryProps>

type Story = StoryObj<StoryProps>

/**
 * Automatic discount promotions show percentage or fixed amount discounts.
 * These are typically used for sales, seasonal offers, or inventory clearance.
 */
export const AutomaticDiscount: Story = {
  args: {
    deal: {
      id: 1,
      name: 'Automatic Discount',
      headline: 'Dress Up & Save!',
      subline: 'Get any 3 dresses for a fixed price of just $50.',
      conditions:
        'Add the relevant products to your cart to take advantage of the offer.',
      hideCountdown: false,
      schedule: {
        from: new Date(Date.now()).toISOString(),
        to: expirationDate,
      },
      color: {
        backgroundColor: '#FFC65F',
        color: '#171717',
      },
    } as unknown as Promotion,
  },
}

const automaticDiscountAppliedDeal = {
  id: 1,
  name: 'Automatic Discount',
  headline: 'Dress Up & Save!',
  subline: 'Get any 3 dresses for a fixed price of just $50.',
  conditions:
    'Add the relevant products to your cart to take advantage of the offer.',
  hideCountdown: false,
  schedule: {
    from: new Date(Date.now()).toISOString(),
    to: expirationDate,
  },
  color: {
    backgroundColor: '#FFC65F',
    color: '#171717',
  },
} as unknown as Promotion

const buyXGetYUnlockedDeal = {
  id: 2,
  name: 'Free Socks Promo',
  headline: 'Buy Shoes, Get Free Socks',
  subline:
    'Buy any pair of shoes and receive a free pair of socks. Limited time only!',
  conditions: 'Conditions',
  hideCountdown: false,
  schedule: {
    from: new Date(Date.now()).toISOString(),
    to: expirationDate,
  },
  color: {
    backgroundColor: '#aeecef',
    color: '#171717',
  },
  effect: {
    type: 'buy_x_get_y',
    variantIds: [1, 2, 3],
  },
} as unknown as Promotion

function buildBasketWithAppliedPromotion(
  deal: Promotion,
  total: string,
  totalInCents: number,
): Basket {
  return {
    itemCount: 1,
    availableItems: [{ ...baseBasketItem }],
    unavailableItems: [],
    cost: createBasketCost(0, total, {
      promotionReductionsPerPromotion: [
        {
          id: String(deal.id),
          name: deal.name,
          headline: deal.name,
          color: deal.color,
          total,
          totalInCents,
        },
      ],
      promotionReductionSumInCents: totalInCents,
      hasReductions: true,
    }),
    promotionCodes: [],
    giftPromotions: [],
  }
}

/**
 * Automatic discount promotions show percentage or fixed amount discounts.
 * These are typically used for sales, seasonal offers, or inventory clearance.
 */
export const AutomaticDiscountApplied: Story = {
  args: {
    deal: automaticDiscountAppliedDeal,
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: {
        ...page.props,
        basket: buildBasketWithAppliedPromotion(
          automaticDiscountAppliedDeal,
          '$5.00',
          500,
        ),
      },
    })
  },
}

/**
 * Buy X Get Y promotions encourage customers to purchase multiple items
 * by offering a free or discounted item with their purchase.
 */
export const BuyXGetYUnlocked: Story = {
  args: {
    deal: buyXGetYUnlockedDeal,
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: {
        ...page.props,
        basket: {
          ...buildBasketWithAppliedPromotion(buyXGetYUnlockedDeal, '$0.00', 0),
          giftPromotions: [buyXGetYUnlockedDeal as Promotion<BuyXGetYEffect>],
        },
      },
    })
  },
}

/**
 * Tiered promotion: no tier reached yet. Shows "remaining minimum order value" and progress bar below first milestone.
 * Basket mocked with zero total so useMOVPromotions shows remaining MOV to first tier.
 */
export const TieredPromotionRemainingMinimumOrderValue: Story = {
  args: {
    deal: tieredDealBase,
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, ...storefrontForMOV, basket: basketRemainingMOV },
    } as unknown as ReturnType<typeof usePage>)
  },
}

/**
 * Tiered promotion: first tier reached but promotion not yet applied. Shows "fulfilled promotion condition".
 * useMOVPromotions reads basket from usePage(); basket is mocked with total above first tier, no promotion on items.
 */
export const TieredPromotionFulfilledCondition: Story = {
  args: {
    deal: tieredDealBase,
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: {
        ...page.props,
        ...storefrontForMOV,
        basket: basketFulfilledCondition,
      },
    } as unknown as ReturnType<typeof usePage>)
  },
}

/**
 * Tiered promotion: all tiers reached. Shows "full savings" with final discount.
 * Basket mocked with total at max tier and promotion applied.
 */
export const TieredPromotionFullSavings: Story = {
  args: {
    deal: tieredDealBase,
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, ...storefrontForMOV, basket: basketFullSavings },
    } as unknown as ReturnType<typeof usePage>)
  },
}

/**
 * Tiered promotion: mid tiers reached, promotion applied. Shows "partial savings" with current discount.
 * Basket mocked with total at second tier and promotion applied.
 */
export const TieredPromotionPartialSavings: Story = {
  args: {
    deal: tieredDealBase,
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: {
        ...page.props,
        ...storefrontForMOV,
        basket: basketPartialSavings,
      },
    } as unknown as ReturnType<typeof usePage>)
  },
}

/**
 * Standard countdown state (> 24 hours remaining).
 * Timer displays "X Days left" text instead of a ticking countdown.
 */
export const StandardCountdown: Story = {
  args: {
    deal: {
      id: 1,
      name: 'Standard Timer',
      headline: 'Summer Sale',
      subline: 'Up to 50% off on selected items.',
      conditions: '',
      hideCountdown: false,
      schedule: {
        from: new Date(Date.now()).toISOString(),
        to: expirationDate,
      },
      color: {
        backgroundColor: '#FFC65F',
        color: '#171717',
      },
    } as unknown as Promotion,
  },
}

/**
 * Urgent countdown state (< 24 hours remaining).
 * Timer displays "Ends in: HH hrs : MM min : SS sec" with a ticking countdown.
 */
export const UrgentCountdown: Story = {
  args: {
    deal: {
      id: 1,
      name: 'Urgent Timer',
      headline: 'Flash Sale',
      subline: 'Ending soon!',
      conditions: '',
      hideCountdown: false,
      schedule: {
        from: new Date(Date.now()).toISOString(),
        to: urgentExpirationDate,
      },
      color: {
        backgroundColor: '#d42411',
        color: '#FFFFFF',
      },
    } as unknown as Promotion,
  },
}
