import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { DetailedProduct } from '@scayle/storefront/types'
import SFProductGallery from './SFProductGallery.vue'

/**
 * SFProductGallery renders the PDP media column. Below 640px it is a full-bleed
 * swipe slider; from 640px up it is a grid that shows every image and video at
 * once. Both variants share one zoom modal, opened by tapping an image slide or
 * clicking an image tile. Videos play in place and do not open zoom.
 */
export default {
  title: 'Product/Detail/Product Gallery/SFProductGallery',
  component: SFProductGallery,
  render: (args: ComponentPropsAndSlots<typeof SFProductGallery>) => ({
    components: { SFProductGallery },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-screen-md h-fit">
        <SFProductGallery v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductGallery>

type Story = StoryObj<typeof SFProductGallery>

const product: DetailedProduct = {
  id: 1,
  name: 'Product 1',
  sellableTimeframe: { state: 'active' },
  images: [
    {
      url: 'product-1-big.avif',
      name: 'product-1-big.avif',
      applyPadding: false,
    },
    {
      url: 'product-2-big.avif',
      name: 'product-2-big.avif',
      applyPadding: false,
    },
    {
      url: 'product-3-big.avif',
      name: 'product-3-big.avif',
      applyPadding: false,
    },
  ],
  isSoldOut: false,
  color: 'Red',
  brand: 'Brand 1',
  referenceKey: '1234567890',
  price: {
    finalPrice: '$10.00',
    originalPrice: '$10.00',
    finalPriceInCents: 1000,
    originalPriceInCents: 1000,
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
  link: '/product/1',
  isNew: false,
  badge: undefined,
  breadcrumbs: [],
  siblings: [],
  variants: [],
  isLowStock: false,
  details: [],
  attributeValuesByGroup: {},
  videos: [],
}

/** Storybook static assets (`.storybook/assets/`), same as CMS Video stories. */
const storybookVideo = {
  url: 'video.mp4',
  posterUrl: 'desktopImage.avif',
}

/**
 * Three images: from 640px up the grid renders a full-width first tile above a
 * two-up row. Resize below 640px to see the swipe slider.
 */
export const Default: Story = {
  args: {
    product,
  },
}

/**
 * A single image fills the grid as one full-width tile (and one slide on mobile).
 */
export const SingleImage: Story = {
  name: 'Single image',
  args: {
    product: {
      ...product,
      images: [product.images[0]!],
    },
  },
}

/**
 * Seven images: the grid packs them into two-up rows above a final three-up row,
 * demonstrating the row-partition rules.
 */
export const ManyImages: Story = {
  name: 'Many images',
  args: {
    product: {
      ...product,
      // Only three large product images ship in `.storybook/assets/`. The query
      // keeps each URL unique, since the image grid keys items by URL.
      images: Array.from({ length: 7 }, (_, index) => ({
        url: `product-${(index % 3) + 1}-big.avif?image=${index + 1}`,
        name: `product-${(index % 3) + 1}-big.avif`,
        applyPadding: false,
      })),
    },
  },
}

/**
 * Shows the product gallery with a storefront badge.
 */
export const WithStorefrontBadge: Story = {
  name: 'With storefront badge',
  args: {
    product: {
      ...product,
      badge: 'Storefront Badge',
    },
  },
}

/**
 * Shows the product gallery with a storefront badge and new badge.
 */
export const WithStorefrontBadgeAndNew: Story = {
  name: 'With storefront badge and new',
  args: {
    product: {
      ...product,
      badge: 'Storefront Badge',
      isNew: true,
    },
  },
}

/**
 * A product video sits in the second gallery slot (index 1). From 640px up
 * the first video autoplays muted; below 640px it autoplays when that slide
 * is active.
 */
export const WithVideo: Story = {
  name: 'With video',
  args: {
    product: {
      ...product,
      images: [
        {
          url: 'product-1-big.avif',
          name: 'product-1-big.avif',
          applyPadding: false,
        },
        {
          url: 'product-2-big.avif',
          name: 'product-2-big.avif',
          applyPadding: false,
        },
        {
          url: 'product-3-big.avif',
          name: 'product-3-big.avif',
          applyPadding: false,
        },
      ],
      videos: [storybookVideo],
    },
  },
}
