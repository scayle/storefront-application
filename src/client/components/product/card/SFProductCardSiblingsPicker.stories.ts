import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import type { ProductImage, ProductSibling } from '@scayle/storefront/types'
import { createMockListingProduct } from '../../../../test/mock-data/products'
import SFProductCardSiblingsPicker from './SFProductCardSiblingsPicker.vue'

function siblingImage(path: string, applyPadding = false): ProductImage {
  return {
    url: path,
    name: `${path}.jpg`,
    applyPadding,
  }
}

const twoSiblings: ProductSibling[] = [
  {
    id: 1,
    name: "Jacket 'Premium'",
    brand: 'ADIDAS ORIGINALS',
    isSoldOut: false,
    color: 'Black',
    link: '/products/jacket-premium-black',
    image: siblingImage('product-1-big.avif'),
  },
  {
    id: 2,
    name: "Jacket 'Premium'",
    brand: 'ADIDAS ORIGINALS',
    isSoldOut: false,
    color: 'Navy',
    link: '/products/jacket-premium-navy',
    image: siblingImage('product-2-big.avif'),
  },
]

const threeSiblings: ProductSibling[] = [
  ...twoSiblings,
  {
    id: 3,
    name: "Jacket 'Premium'",
    brand: 'ADIDAS ORIGINALS',
    isSoldOut: false,
    color: 'Purple',
    link: '/products/jacket-premium-purple',
    image: siblingImage('product-1-big.avif'),
  },
]

const withSoldOut: ProductSibling[] = [
  {
    ...twoSiblings[0]!,
    isSoldOut: false,
  },
  {
    ...twoSiblings[1]!,
    isSoldOut: true,
  },
  {
    id: 3,
    name: "Jacket 'Premium'",
    brand: 'ADIDAS ORIGINALS',
    isSoldOut: true,
    color: 'Purple',
    link: '/products/jacket-premium-purple',
    image: siblingImage('product-1-big.avif'),
  },
]

const twelveSiblings: ProductSibling[] = Array.from(
  { length: 12 },
  (_, index) => ({
    ...threeSiblings[index % threeSiblings.length]!,
    id: index + 1,
    // The current product shows `product-1-big.avif`, so siblings alternate two other images.
    image: siblingImage(
      index % 2 === 0 ? 'product-2-big.avif' : 'product-3-big.avif',
    ),
  }),
)

const productLink = '/products/jacket-premium-black'

const product = createMockListingProduct({
  id: 1,
  name: "Jacket 'Premium'",
  color: 'Black',
  link: productLink,
})

/**
 * SFProductCardSiblingsPicker shows the current product first, then up to two non-sold-out
 * siblings. The third swatch is hidden in product cards narrower than 13.625rem. "+N more" links to
 * the PDP when more swatches exist than fit in a compact (2) or wide (3) card.
 */
export default {
  title: 'Product/Card/SFProductCardSiblingsPicker',
  component: SFProductCardSiblingsPicker,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFProductCardSiblingsPicker>,
  ) => ({
    components: { SFProductCardSiblingsPicker },
    setup() {
      return { args }
    },
    template: `
      <div class="@container/product-card w-64">
        <SFProductCardSiblingsPicker v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    siblings: { control: false },
    product: { control: false },
    productLink: { control: 'text' },
  },
} satisfies Meta<typeof SFProductCardSiblingsPicker>

type Story = StoryObj<typeof SFProductCardSiblingsPicker>

/**
 * Two non-sold-out siblings; the third swatch is visible from a card width of 13.625rem.
 */
export const TwoSiblings: Story = {
  args: {
    siblings: twoSiblings,
    product,
    productLink,
  },
}

/**
 * Three siblings; the third swatch is visible from a card width of 13.625rem, and "+1" follows it.
 */
export const ThreeSiblings: Story = {
  args: {
    siblings: threeSiblings,
    product,
    productLink,
  },
}

/**
 * Three siblings in a card narrower than 13.625rem, such as the 198px cards in the basket
 * slide-in: two swatches show, and the compact "+2" follows them.
 */
export const InNarrowCard: Story = {
  args: {
    siblings: threeSiblings,
    product,
    productLink,
  },
  render: (args) => ({
    components: { SFProductCardSiblingsPicker },
    setup() {
      return { args }
    },
    template: `
      <div class="@container/product-card" style="width: 198px">
        <SFProductCardSiblingsPicker v-bind="args" />
      </div>
    `,
  }),
}

/**
 * Current product plus twelve siblings: three of the 13 swatches show, so "+10" follows them.
 */
export const ManySiblings: Story = {
  args: {
    siblings: twelveSiblings,
    product,
    productLink,
  },
}

/**
 * Mix of available and sold-out siblings; only non-sold-out count toward the visible row.
 */
export const WithSoldOut: Story = {
  args: {
    siblings: withSoldOut,
    product,
    productLink,
  },
}

/**
 * Trimmed sibling assets. Every swatch takes the compact padding step, matching the
 * product detail page sibling row.
 */
export const PaddedSiblingImages: Story = {
  args: {
    siblings: twoSiblings.map((sibling) => ({
      ...sibling,
      image: { ...sibling.image!, applyPadding: true },
    })),
    product: createMockListingProduct({
      id: 1,
      name: "Jacket 'Premium'",
      color: 'Black',
      link: productLink,
    }),
    productLink,
  },
}
