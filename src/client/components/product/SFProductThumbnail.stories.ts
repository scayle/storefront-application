import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import { ProductImageForcedState, ThumbnailSize } from '@client/utils/constants'
import SFProductThumbnail from './SFProductThumbnail.vue'

/**
 * SFProductThumbnail renders design-system thumbnail images with size presets,
 * border states, skeleton loading, and error placeholders.
 *
 * Key features:
 * - Size presets: small (40px), medium (48px), large (60px)
 * - Border states: enabled, hover, selected, focus, disabled
 * - Skeleton-only loading state (no visible image until loaded)
 */
export default {
  title: 'Product/SFProductThumbnail',
  component: SFProductThumbnail,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductThumbnail>) => ({
    components: { SFProductThumbnail },
    setup() {
      return { args, ThumbnailSize, ProductImageForcedState }
    },
    template: `
      <div class="w-auto p-4">
        <SFProductThumbnail v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    alt: {
      description: 'Alt text for the image',
      control: 'text',
    },
    url: {
      description:
        'Absolute CDN base URL; with `preset`, the responsive variant is built on the client',
      control: 'text',
    },
    preset: {
      description: 'Responsive preset name, requires `url`',
      control: 'text',
    },
    thumbnailSize: {
      description: 'Thumbnail size preset',
      control: 'select',
      options: Object.values(ThumbnailSize),
    },
    imageLoading: {
      description: 'Loading attribute for the img element (defaults to lazy)',
      control: 'select',
      options: ['lazy', 'eager'],
    },
    selected: {
      description: 'Selected thumbnail (primary border)',
      control: 'boolean',
    },
    disabled: {
      description: 'Disabled thumbnail',
      control: 'boolean',
    },
    applyPadding: {
      description:
        'Pad the frame (set from the image `applyPadding` attribute). Thumbnails always use the compact step.',
      control: 'boolean',
    },
    forceState: {
      description: 'Force skeleton or error UI',
      control: 'select',
      options: [undefined, ...Object.values(ProductImageForcedState)],
    },
  },
} satisfies Meta<typeof SFProductThumbnail>

type Story = StoryObj<typeof SFProductThumbnail>

/**
 * Thumbnail enabled state at large size.
 */
export const ThumbnailEnabled: Story = {
  args: {
    url: 'product-1-big.avif',
    preset: 'thumbnail',
    alt: 'Thumbnail',
    thumbnailSize: ThumbnailSize.LG,
  },
}

/**
 * Thumbnail selected state with primary border.
 */
export const ThumbnailSelected: Story = {
  args: {
    ...ThumbnailEnabled.args,
    selected: true,
  },
}

/**
 * Padded thumbnail. `applyPadding` flags trimmed assets that would otherwise sit
 * flush to the frame. Thumbnails take the compact step, so the large 60px frame
 * leaves a 48px image box.
 */
export const ThumbnailWithPadding: Story = {
  args: {
    ...ThumbnailEnabled.args,
    applyPadding: true,
  },
}

/**
 * Thumbnail disabled state with muted image.
 */
export const ThumbnailDisabled: Story = {
  args: {
    ...ThumbnailEnabled.args,
    disabled: true,
  },
}

/**
 * Thumbnail skeleton loading state.
 */
export const ThumbnailSkeleton: Story = {
  args: {
    ...ThumbnailEnabled.args,
    forceState: ProductImageForcedState.SKELETON,
  },
}

/**
 * Thumbnail error placeholder.
 */
export const ThumbnailError: Story = {
  args: {
    ...ThumbnailEnabled.args,
    forceState: ProductImageForcedState.ERROR,
  },
}

/**
 * Thumbnail size matrix: small, medium, and large.
 */
export const ThumbnailSizes: Story = {
  render: (args) => ({
    components: { SFProductThumbnail },
    setup() {
      return { args, ThumbnailSize }
    },
    template: `
      <div class="flex items-end gap-4 p-4">
        <SFProductThumbnail v-bind="args" :thumbnail-size="ThumbnailSize.SM" alt="Small thumbnail" />
        <SFProductThumbnail v-bind="args" :thumbnail-size="ThumbnailSize.MD" alt="Medium thumbnail" />
        <SFProductThumbnail v-bind="args" :thumbnail-size="ThumbnailSize.LG" alt="Large thumbnail" />
      </div>
    `,
  }),
  args: {
    url: 'product-1-big.avif',
    preset: 'thumbnail',
    alt: 'Thumbnail',
  },
}
