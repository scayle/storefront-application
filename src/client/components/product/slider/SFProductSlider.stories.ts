import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import { createMockListingProduct } from '../../../../test/mock-data/products'
import SFProductSlider from './SFProductSlider.vue'

const sneakers = createMockListingProduct({
  id: 1,
  name: 'Air Max 90',
  brand: 'Nike',
  link: '/products/air-max-90',
  isNew: true,
  price: {
    finalPrice: '€129.99',
    originalPrice: '€129.99',
    finalPriceInCents: 12999,
    originalPriceInCents: 12999,
    currency: 'EUR',
    hasDifferentPrices: false,
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
  },
})

const sneakersSale = createMockListingProduct({
  id: 2,
  name: 'Stan Smith',
  brand: 'Adidas',
  link: '/products/stan-smith',
  price: {
    finalPrice: '€67.49',
    originalPrice: '€89.99',
    finalPriceInCents: 6749,
    originalPriceInCents: 8999,
    currency: 'EUR',
    hasDifferentPrices: false,
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
  },
})

const tShirt = createMockListingProduct({
  id: 3,
  name: 'Cotton T-Shirt',
  brand: 'H&M',
  link: '/products/cotton-t-shirt',
  images: [],
  siblings: [],
  price: {
    finalPrice: '€19.99',
    originalPrice: '€19.99',
    finalPriceInCents: 1999,
    originalPriceInCents: 1999,
    currency: 'EUR',
    hasDifferentPrices: false,
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
  },
})

const jeans = createMockListingProduct({
  id: 4,
  name: '501 Original',
  brand: "Levi's",
  link: '/products/501-original',
  images: [],
  siblings: [],
  price: {
    finalPrice: '€89.99',
    originalPrice: '€89.99',
    finalPriceInCents: 8999,
    originalPriceInCents: 8999,
    currency: 'EUR',
    hasDifferentPrices: false,
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
  },
})

const jacket = createMockListingProduct({
  id: 5,
  name: 'Nuptse Jacket',
  brand: 'The North Face',
  link: '/products/nuptse-jacket',
  isSoldOut: true,
  images: [],
  siblings: [],
  price: {
    finalPrice: '€259.99',
    originalPrice: '€259.99',
    finalPriceInCents: 25999,
    originalPriceInCents: 25999,
    currency: 'EUR',
    hasDifferentPrices: false,
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
  },
})

const allProducts = [sneakers, sneakersSale, tShirt, jeans, jacket]

/**
 * SFProductSlider displays a horizontal scrollable row of product cards with
 * prev/next arrow navigation. Used for recommendation sliders (e.g. "You may also like")
 * and other curated product collections on the Product Detail page.
 */
export default {
  title: 'Product/Slider/SFProductSlider',
  component: SFProductSlider,
  render: (args: ComponentPropsAndSlots<typeof SFProductSlider>) => ({
    components: { SFProductSlider },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-4xl p-6 bg-gray-100">
        <SFProductSlider v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    products: { control: false },
  },
} satisfies Meta<typeof SFProductSlider>

type Story = StoryObj<typeof SFProductSlider>

/**
 * Full set of products: enough to require scrolling and show the arrow navigation.
 */
export const Default: Story = {
  args: {
    title: 'You May Also Like',
    products: allProducts,
  },
}
