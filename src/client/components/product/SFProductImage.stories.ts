import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { ProductImageForcedState } from '@client/utils/constants'
import SFProductImage from './SFProductImage.vue'

/**
 * SFProductImage renders design-system product images with skeleton loading,
 * error placeholders, aspect ratio, and hover overlay.
 *
 * Key features:
 * - Portrait aspect ratio (3:4) with object-fit contain
 * - Skeleton-only loading state (no visible image until loaded)
 * - Error fallback with placeholder icon on `bg-gray-100`
 * - Hover overlay on supported devices
 */
export default {
  title: 'Product/SFProductImage',
  component: SFProductImage,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductImage>) => ({
    components: { SFProductImage },
    setup() {
      return { args, ProductImageForcedState }
    },
    template: `
      <div class="h-80 w-64 bg-gray-100">
        <SFProductImage v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    alt: {
      description: 'Alt text for the image',
      control: 'text',
    },
    imageLoading: {
      description: 'Loading attribute for the img element (defaults to lazy)',
      control: 'select',
      options: ['lazy', 'eager'],
    },
    forceState: {
      description: 'Force skeleton or error UI',
      control: 'select',
      options: [undefined, ...Object.values(ProductImageForcedState)],
    },
    applyPadding: {
      description:
        'Pad the image frame (set from the image `applyPadding` attribute)',
      control: 'boolean',
    },
    paddingSize: {
      description: 'How much room a padded frame leaves',
      control: 'select',
      options: ['default', 'compact'],
    },
  },
} satisfies Meta<typeof SFProductImage>

type Story = StoryObj<typeof SFProductImage>

/**
 * Default product image with portrait aspect ratio.
 */
export const ProductDefault: Story = {
  args: {
    srcSet: 'product-1-big.avif',
    sizes: '(min-width: 48rem) 50vw, 100vw',
    src: 'product-1-big.avif',
    alt: 'Product image',
    imageLoading: 'eager',
    withMixBlendDarken: true,
  },
}

/**
 * Padded product image. The `applyPadding` attribute flags trimmed (enclosed) assets,
 * which are cropped tight to the product and would otherwise sit flush against the
 * frame. Compare against `ProductDefault`.
 */
export const ProductWithPadding: Story = {
  args: {
    ...ProductDefault.args,
    applyPadding: true,
  },
}

/**
 * Compact padding at the size it is actually used: the 48px swatch of the product card
 * siblings picker, where the default step would leave almost no product visible. The
 * product detail page sibling row uses the same step on a 60px frame.
 */
export const ProductWithCompactPadding: Story = {
  render: (args) => ({
    components: { SFProductImage },
    setup() {
      return { args }
    },
    template: `
      <div class="size-12 overflow-hidden rounded-md">
        <SFProductImage v-bind="args" />
      </div>
    `,
  }),
  args: {
    ...ProductDefault.args,
    applyPadding: true,
    paddingSize: 'compact',
  },
}

/**
 * Product image skeleton (forced for documentation).
 */
export const ProductSkeleton: Story = {
  args: {
    ...ProductDefault.args,
    forceState: ProductImageForcedState.SKELETON,
  },
}

/**
 * Product image error placeholder (invalid src).
 */
export const ProductError: Story = {
  args: {
    ...ProductDefault.args,
    src: 'missing-product-image.avif',
    srcSet: 'missing-product-image.avif',
    forceState: ProductImageForcedState.ERROR,
  },
}
