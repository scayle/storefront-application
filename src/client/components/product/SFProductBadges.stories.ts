import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { DetailedProduct } from '@scayle/storefront/types'
import SFProductBadges from './SFProductBadges.vue'

/** Minimal product shape for badge stories; only isNew and storefrontBadge affect the badges. */
const baseProduct: DetailedProduct = {
  id: 1,
  name: 'Product',
  isSoldOut: false,
  color: 'Red',
  brand: 'Brand',
  referenceKey: 'ref-1',
  price: {
    finalPrice: '$9.90',
    originalPrice: '$9.90',
    finalPriceInCents: 990,
    originalPriceInCents: 990,
    currency: 'EUR',
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
    hasDifferentPrices: false,
  },
  sellableTimeframe: { state: 'active' },
  link: '/product/1',
  isNew: false,
  badge: undefined,
  images: [],
  breadcrumbs: [],
  siblings: [],
  variants: [],
  isLowStock: false,
  details: [],
  attributeValuesByGroup: {},
  videos: [],
}

/**
 * SFProductBadges renders product badges derived from the product (e.g. "New in" and storefront badge).
 * Used on product cards and in the product gallery to show a single combined badge when the product is new and/or has a storefront badge.
 *
 * Key features:
 * - Shows "New in" when product.isNew is true (via i18n)
 * - Shows product.storefrontBadge when set
 * - Renders nothing when there are no labels
 */
export default {
  title: 'Product/SFProductBadges',
  component: SFProductBadges,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductBadges>) => ({
    components: { SFProductBadges },
    setup() {
      return { args }
    },
    template: `<SFProductBadges v-bind="args" />`,
  }),
  argTypes: {
    product: {
      description: 'Product; badges are derived from isNew and storefrontBadge',
      control: false,
    },
  },
} satisfies Meta<typeof SFProductBadges>

type Story = StoryObj<typeof SFProductBadges>

/**
 * Product with no badge labels (not new, no storefront badge).
 * Component renders an empty container.
 */
export const NoBadges: Story = {
  args: {
    product: baseProduct,
  },
}

/**
 * Product marked as new; shows the translated "New in" label.
 */
export const NewOnly: Story = {
  args: {
    product: { ...baseProduct, isNew: true },
  },
}

/**
 * Product with a storefront badge only (e.g. "Sale", "Limited").
 */
export const StorefrontBadgeOnly: Story = {
  args: {
    product: { ...baseProduct, storefrontBadge: 'Sale' },
  },
}

/**
 * Product that is both new and has a storefront badge; shows "New in" and the badge in one pill.
 */
export const NewAndStorefrontBadge: Story = {
  args: {
    product: {
      ...baseProduct,
      isNew: true,
      storefrontBadge: 'Limited',
    },
  },
}
