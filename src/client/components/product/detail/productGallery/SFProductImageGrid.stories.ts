import { ref } from 'vue'
import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { ProductGalleryItem } from '@shared/utils/productGalleryMedia'
import SFProductImageGrid from './SFProductImageGrid.vue'

/**
 * SFProductImageGrid lays every product image and video out at once for the PDP
 * media column from 640px up. A 6-column track plus per-tile column spans packs
 * the tiles into rows that always fill the width: a 1-2 tile top row, then 2-3
 * tiles per row. Image tiles open the zoom via `enlarge`; video tiles play in
 * place via `playVideo`.
 */
export default {
  title: 'Product/Detail/Product Gallery/SFProductImageGrid',
  component: SFProductImageGrid,
  render: (args: ComponentPropsAndSlots<typeof SFProductImageGrid>) => ({
    components: { SFProductImageGrid },
    setup() {
      const firstVideoIndex = args.items?.findIndex(
        (item) => item.type === 'video',
      )
      const playingVideoIndex = ref(
        args.playingVideoIndex ??
          (firstVideoIndex === -1 ? undefined : firstVideoIndex),
      )
      const playVideo = (index: number) => {
        const item = args.items?.[index]
        if (item?.type === 'video') {
          playingVideoIndex.value = index
        }
      }
      return { args, playingVideoIndex, playVideo }
    },
    template: `
      <div class="w-full max-w-screen-md">
        <SFProductImageGrid
          v-bind="args"
          :playing-video-index="playingVideoIndex"
          @play-video="playVideo"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductImageGrid>

type Story = StoryObj<typeof SFProductImageGrid>

// Only three large product images ship in `.storybook/assets/`, so larger counts
// repeat them. The query keeps each URL unique, since the grid keys items by URL.
const buildImages = (count: number): ProductGalleryItem[] =>
  Array.from({ length: count }, (_, index) => ({
    type: 'image' as const,
    url: `product-${(index % 3) + 1}-big.avif?image=${index + 1}`,
  }))

/** Storybook static assets (`.storybook/assets/`), same as CMS Video stories. */
const storybookVideoItem: ProductGalleryItem = {
  type: 'video',
  url: 'video.mp4',
  posterUrl: 'desktopImage.avif',
}

/**
 * Three images: a full-width first tile above a two-up row.
 */
export const Default: Story = {
  args: {
    items: buildImages(3),
    productName: 'Product 1',
  },
}

/**
 * A single image fills the track as one full-width tile.
 */
export const SingleImage: Story = {
  name: 'Single image',
  args: {
    items: buildImages(1),
    productName: 'Product 1',
  },
}

/**
 * Seven images: two-up rows above a final three-up row.
 */
export const ManyImages: Story = {
  name: 'Many images',
  args: {
    items: buildImages(7),
    productName: 'Product 1',
  },
}

/**
 * A video tile in the second slot, matching PDP insertion. It autoplays
 * muted; click another video to switch which one is playing.
 */
export const WithVideo: Story = {
  name: 'With video',
  args: {
    items: [
      { type: 'image', url: 'product-1-big.avif' },
      storybookVideoItem,
      { type: 'image', url: 'product-2-big.avif' },
      { type: 'image', url: 'product-3-big.avif' },
    ],
    productName: 'Product 1',
  },
}
