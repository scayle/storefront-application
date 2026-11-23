import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ProductImageForcedState } from '@client/utils/constants'
import SFProductImageBase from './SFProductImageBase.vue'

/**
 * SFProductImageBase is the shared frame behind `SFProductImage` and
 * `SFProductThumbnail`. Use those two in pages; this story shows the frame
 * itself, so a change to it can be checked in one place.
 *
 * - `product` keeps the portrait aspect ratio and darkens on hover.
 * - `thumbnail` fills its parent and draws a border for the selected and
 *   disabled states, with a diagonal strike-through when disabled.
 *
 * Both variants show a skeleton until the image loads and a placeholder icon
 * when it fails or `src` is missing. `forceState` pins either state.
 */
export default {
  title: 'Product/SFProductImageBase',
  component: SFProductImageBase,
  parameters: { layout: 'centered' },
  args: {
    variant: 'product',
    src: 'product-1-big.avif',
    alt: "Jacket 'Premium' in black",
    imageLoading: 'eager',
    withMixBlendDarken: true,
  },
  argTypes: {
    variant: { control: 'select', options: ['product', 'thumbnail'] },
    fit: { control: 'select', options: ['contain', 'cover'] },
    forceState: {
      control: 'select',
      options: [undefined, ...Object.values(ProductImageForcedState)],
    },
  },
  render: (args) => ({
    components: { SFProductImageBase },
    setup() {
      return { args }
    },
    template: `
      <div :class="args.variant === 'thumbnail' ? 'size-20' : 'w-64'">
        <SFProductImageBase v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductImageBase>

type Story = StoryObj<typeof SFProductImageBase>

/** Product variant: portrait frame with a hover overlay once the image has loaded. */
export const Product: Story = {}

/** Thumbnail variant at rest: transparent border that turns primary on hover. */
export const Thumbnail: Story = {
  args: { variant: 'thumbnail', src: 'product-1.avif' },
}

/** Selected thumbnail, such as the active image in a gallery strip. */
export const ThumbnailSelected: Story = {
  args: { variant: 'thumbnail', src: 'product-1.avif', selected: true },
}

/** Disabled thumbnail, such as a sold-out sibling: muted image with a strike-through. */
export const ThumbnailDisabled: Story = {
  args: { variant: 'thumbnail', src: 'product-1.avif', disabled: true },
}

/** Loading state, pinned with `forceState` so it does not disappear on load. */
export const Skeleton: Story = {
  args: { forceState: ProductImageForcedState.SKELETON },
}

/** Failed or missing image: placeholder icon that keeps the alt text as its label. */
export const MissingImage: Story = {
  args: { src: undefined },
}
