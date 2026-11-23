import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import type { ProductImage } from '@scayle/storefront/types'
import SFProductCardImageSlider from './SFProductCardImageSlider.vue'

function productImage(path: string): ProductImage {
  return {
    url: path,
    name: `${path}.jpg`,
    applyPadding: false,
  }
}

const singleImage: ProductImage[] = [productImage('product-1-big.avif')]
const multipleImages: ProductImage[] = [
  productImage('product-1-big.avif'),
  productImage('product-2-big.avif'),
  productImage('product-3-big.avif'),
]

/**
 * SFProductCardImageSlider shows a horizontal slider of product images on the card.
 * Arrows are shown only on non-touch devices when the card is hovered and there is more than one image.
 */
export default {
  title: 'Product/Card/SFProductCardImageSlider',
  component: SFProductCardImageSlider,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductCardImageSlider>) => ({
    components: { SFProductCardImageSlider },
    setup() {
      return { args }
    },
    template: `
      <div class="w-64 aspect-product bg-gray-100">
        <SFProductCardImageSlider v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    link: { control: 'text', description: 'Link target for each image' },
    isProductHovered: {
      control: 'boolean',
      description:
        'When true (and non-touch), arrows are shown for multiple images',
    },
    images: { control: false },
    productIndex: { control: 'number' },
    alt: { control: 'text' },
  },
} satisfies Meta<typeof SFProductCardImageSlider>

type Story = StoryObj<typeof SFProductCardImageSlider>

/**
 * Single image; no slider navigation.
 */
export const Default: Story = {
  args: {
    link: '/products/jacket-premium',
    isProductHovered: false,
    images: singleImage,
    alt: 'Jacket Premium',
  },
}

/**
 * Two or three images; arrows hidden when not hovered (non-touch).
 */
export const MultipleImages: Story = {
  args: {
    link: '/products/jacket-premium',
    isProductHovered: false,
    images: multipleImages,
    alt: 'Jacket Premium',
  },
}

/**
 * Multiple images with hover state so prev/next arrows are visible (non-touch only).
 */
export const HoveredWithMultipleImages: Story = {
  args: {
    link: '/products/jacket-premium',
    isProductHovered: true,
    images: multipleImages,
    alt: 'Jacket Premium',
  },
}
