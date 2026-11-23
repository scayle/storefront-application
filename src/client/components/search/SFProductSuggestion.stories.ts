import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createMockListingProduct } from '../../../test/mock-data/products'
import { createMockProductSuggestion } from '../../../test/mock-data/search'
import SFProductSuggestion from './SFProductSuggestion.vue'

const saleProduct = createMockListingProduct({ siblings: [] })

const regularPriceProduct = createMockListingProduct({
  siblings: [],
  price: {
    ...saleProduct.price,
    finalPrice: '$12.99',
    finalPriceInCents: 1299,
    isOnSale: false,
    totalReduction: undefined,
    showOriginally: false,
    strikeOriginally: false,
  },
})

/**
 * SFProductSuggestion is the product row in the search suggestions under the
 * header search field: the first product image as a thumbnail, the brand and
 * name, and the price. The row links to the product detail page.
 *
 * Brand and name are cut off with an ellipsis instead of wrapping, so every
 * row keeps the same height. The row is highlighted while it is the active
 * suggestion during keyboard navigation, when `activeId` matches its id.
 */
export default {
  title: 'Search/SFProductSuggestion',
  component: SFProductSuggestion,
  parameters: { layout: 'centered' },
  args: {
    suggestion: createMockProductSuggestion({ product: regularPriceProduct }),
  },
  argTypes: {
    suggestion: { control: false },
  },
  render: (args) => ({
    components: { SFProductSuggestion },
    setup() {
      return { args }
    },
    template: `
      <div class="w-96">
        <SFProductSuggestion v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductSuggestion>

type Story = StoryObj<typeof SFProductSuggestion>

/** A product at its regular price. */
export const Default: Story = {}

/** A reduced product: final price, struck-through original price and reduction. */
export const OnSale: Story = {
  args: {
    suggestion: createMockProductSuggestion({ product: saleProduct }),
  },
}

/** A long brand and name, cut off with an ellipsis next to the price. */
export const LongName: Story = {
  args: {
    suggestion: createMockProductSuggestion({
      product: createMockListingProduct({
        ...regularPriceProduct,
        brand: 'ADIDAS ORIGINALS PERFORMANCE OUTDOOR COLLECTION',
        name: "Water-repellent padded jacket 'Premium' with detachable hood",
      }),
    }),
  },
}

/** A product without images: the thumbnail slot stays an empty gray frame. */
export const WithoutImage: Story = {
  args: {
    suggestion: createMockProductSuggestion({
      product: createMockListingProduct({ ...regularPriceProduct, images: [] }),
    }),
  },
}

/** The active suggestion during keyboard navigation, highlighted with a border and background. */
export const Active: Story = {
  args: {
    activeId: `search-result-product-${regularPriceProduct.id}`,
  },
}
