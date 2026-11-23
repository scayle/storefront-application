import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test'
import { router, usePage } from '@inertiajs/vue3'
import type { Basket, BasketItem, Promotion } from '@scayle/storefront/types'
import { createMockListingProduct } from '../../../test/mock-data/products'
import SFProductCard from './SFProductCard.vue'

const productDefault = createMockListingProduct({
  images: [],
  siblings: [],
})

const productWithImageSlider = createMockListingProduct()

const productWithSiblings = createMockListingProduct()

const productWithBadges = createMockListingProduct({
  isNew: true,
  badge: 'Sale',
  images: [],
  siblings: [],
})

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

const productInBasket = createMockListingProduct({
  id: 10,
  images: [],
  siblings: [],
})

// Product whose attribute groups match `highlightPromotion` below, so the card
// renders the highlight footer (colored bottom bar). Same id (10) as the basket
// item so the "Already in basket" badge also shows.
const productInBasketWithPromotion = createMockListingProduct({
  id: 10,
  images: [],
  siblings: [],
  attributeValuesByGroup: { '100': [200] },
})

// Same promotion match as above, but a different id (not in `basketWithProduct`),
// so the highlight footer renders without the "Already in basket" badge.
const productWithPromotionNotInBasket = createMockListingProduct({
  id: 11,
  images: [],
  siblings: [],
  attributeValuesByGroup: { '100': [200] },
})

// A highlight promotion that emphasizes matching product cards: colored bottom
// bar with a countdown, plus a repositioned deal badge.
const highlightPromotion: Promotion = {
  id: 'promo-1',
  name: 'Dress bundle deal',
  priority: 1,
  headline: '3 dresses for 99,99 €',
  link: '#',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#e3000b', color: '#ffffff' },
  schedule: {
    from: new Date(Date.now() - 86400000).toISOString(),
    to: new Date(Date.now() + 10 * 86400000).toISOString(),
  },
  product: {
    attributeGroupId: 100,
    attributeId: 200,
    badgeLabel: '3xDress = 99,99 €',
  },
  highlightProductCards: true,
}

const basketWithProduct: Basket = {
  itemCount: 1,
  availableItems: [
    {
      key: 'item-1',
      variants: [],
      promotions: [],
      quantity: 1,
      availableQuantity: 10,
      isLowStock: false,
      status: 'available',
      unitPrice: variantPrice,
      totalPrice: { ...variantPrice, appliedReductions: [] },
      product: productInBasket,
      variant: {
        id: 1,
        label: 'M',
        stock: 10,
        isLowStock: false,
        isSoldOut: false,
        price: variantPrice,
      },
      customData: {},
      sellableTimeframe: { state: 'active' },
    } as BasketItem,
  ],
  unavailableItems: [],
  promotionCodes: [],
  giftPromotions: [],
  cost: {
    finalPrice: '$9.99',
    finalPriceInCents: 999,
    finalPriceWithoutTaxInCents: 999,
    subtotal: '$12.99',
    totalWithoutPromotionsInCents: 999,
    saleAndVoucherReductions: [],
    saleReductionSumInCents: 0,
    campaignReductionSumInCents: 0,
    promotionReductionSumInCents: 0,
    hasCampaignReduction: false,
    hasReductions: false,
    currency: variantPrice.currency,
    promotionReductionsPerPromotion: [],
  },
}

/**
 * SFProductCard is the listing card for a product: image (or image slider when multiple),
 * badges, siblings picker on hover, brand, name, price, and optional "Already in basket" badge.
 * Slider and siblings picker render only after the card has been visible in the viewport.
 */
export default {
  title: 'Product/SFProductCard',
  component: SFProductCard,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductCard>) => ({
    components: { SFProductCard },
    setup() {
      return { args }
    },
    template: `
      <div class="w-64 max-w-full">
        <SFProductCard v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    product: { control: false },
    productIndex: { control: 'number' },
    productListType: { control: false },
    productListId: { control: false },
  },
} satisfies Meta<typeof SFProductCard>

type Story = StoryObj<typeof SFProductCard>

/**
 * Single image, no siblings, no badges. The play step toggles the wishlist
 * and checks that the toggle settles against the Storybook RPC mock.
 */
export const Default: Story = {
  args: {
    product: productDefault,
    productIndex: 0,
    productListType: 'category',
  },
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByTestId(
      'add-item-to-wishlist-button',
    )
    await userEvent.click(toggle)
    // Storybook aliases `router` to the spies in `.storybook/inertia-mock.ts`, so `this` is not used.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    await waitFor(() => expect(router.reload).toHaveBeenCalled())
    await waitFor(() => expect(toggle).not.toHaveAttribute('aria-disabled'))
  },
}

/**
 * Multiple images; slider appears once the card has been visible in the viewport.
 */
export const WithImageSlider: Story = {
  args: {
    product: productWithImageSlider,
    productIndex: 0,
    productListType: 'category',
  },
}

/**
 * Product with siblings; sibling picker appears on hover once the card has been visible.
 */
export const WithSiblings: Story = {
  args: {
    product: productWithSiblings,
    productIndex: 0,
    productListType: 'category',
  },
}

/**
 * Product marked as new with a storefront badge (e.g. Sale).
 */
export const WithBadges: Story = {
  args: {
    product: productWithBadges,
    productIndex: 0,
    productListType: 'category',
  },
}

/**
 * Product is in the basket; the "Already in basket" badge is shown in the bottom-right corner.
 * usePage is mocked to return basket data so the useBasket composable picks it up.
 */
export const InBasket: Story = {
  beforeEach() {
    mocked(usePage).mockReturnValue({
      ...usePage(),
      props: { ...usePage().props, basket: basketWithProduct },
    })
  },

  args: {
    product: productInBasket,
    productIndex: 0,
    productListType: 'category',
  },
}

/**
 * Product is both in the basket and matched by a highlight promotion. Exercises the
 * layout where the "Already in basket" badge rests flush on the colored promotion bar
 * (SFHighlightFooter), pinned to the right edge, with the deal badge stacked above it.
 */
export const InBasketWithHighlightPromotion: Story = {
  beforeEach() {
    mocked(usePage).mockReturnValue({
      ...usePage(),
      props: {
        ...usePage().props,
        basket: basketWithProduct,
        promotions: [highlightPromotion],
      },
    })
  },

  args: {
    product: productInBasketWithPromotion,
    productIndex: 0,
    productListType: 'category',
  },
}

/**
 * Product is matched by a highlight promotion but NOT in the basket. Without the
 * "Already in basket" badge, the deal badge becomes the bottom row of the column and
 * rests flush on the colored promotion bar instead of floating high above it.
 */
export const HighlightPromotionNotInBasket: Story = {
  beforeEach() {
    mocked(usePage).mockReturnValue({
      ...usePage(),
      props: {
        ...usePage().props,
        promotions: [highlightPromotion],
      },
    })
  },

  args: {
    product: productWithPromotionNotInBasket,
    productIndex: 0,
    productListType: 'category',
  },
}

const productWithManySiblings = createMockListingProduct({
  siblings: [1, 2, 3, 4].flatMap((round) =>
    productWithSiblings.siblings.map((sibling) => ({
      ...sibling,
      id: sibling.id * 10 + round,
      isSoldOut: false,
    })),
  ),
})

/**
 * Renders the card at the widths it gets in the Storefront Application: the
 * basket slide-in grid (198px), the product listing grid at 1024px (224px) and
 * the product slider at 1600px (290px). The siblings picker only opens from the
 * `lg` breakpoint, so here we only display desktop versions. Hover a card to open its
 * siblings picker and compare how many swatches fit.
 */
export const InContainerWidths: Story = {
  args: {
    product: productWithManySiblings,
    productIndex: 0,
    productListType: 'category',
  },
  render: (args) => ({
    components: { SFProductCard },
    setup() {
      return { args, widths: [198, 224, 290] }
    },
    template: `
      <div class="flex items-start gap-6">
        <div v-for="width in widths" :key="width" :style="{ width: width + 'px' }">
          <p class="mb-2 text-sm text-secondary">{{ width }}px</p>
          <SFProductCard v-bind="args" />
        </div>
      </div>
    `,
  }),
}
