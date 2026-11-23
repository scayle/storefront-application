import type { StoryObj, Meta } from '@storybook/vue3-vite'
import type { ImageSliderImage } from '@client/utils/constants'
import SFImageStrip from './SFImageStrip.vue'

const image = (path: string, alt: string, hash: string): ImageSliderImage => ({
  url: path,
  preset: 'tile',
  alt,
  hash,
})

const images: ImageSliderImage[] = [
  image('product-1-big.avif', 'Look 1 (1/3)', '1'),
  image('product-2-big.avif', 'Look 2 (2/3)', '2'),
  image('product-3-big.avif', 'Look 3 (3/3)', '3'),
]

/**
 * SFImageStrip is the design-system image list used inside product cards. It is
 * a plain horizontal scroll-snap list (`div role="group"` › `ul` › `li`) with no carousel
 * semantics — no `aria-roledescription`, no per-slide group roles, no live
 * region and no dots. The "image X of Y" context lives in each image's `alt`.
 * Prev/next arrows are optional convenience jump buttons.
 */
export default {
  title: 'UI/Core/SFImageStrip',
  component: SFImageStrip,
  parameters: { layout: 'centered' },
  argTypes: {
    withArrows: { control: 'boolean' },
    forceArrowsVisible: { control: 'boolean' },
    images: { control: false },
  },
  args: {
    images,
    ariaLabel: 'Product images',
  },
} satisfies Meta<typeof SFImageStrip>

type Story = StoryObj<typeof SFImageStrip>

const render = (args: Story['args']) => ({
  components: { SFImageStrip },
  setup() {
    return { args }
  },
  template: `
    <div class="aspect-product w-64">
      <SFImageStrip v-bind="args" />
    </div>
  `,
})

/** Default — plain scrollable list, no arrows. */
export const Default: Story = {
  render,
}

/** With arrows — optional convenience jump buttons, forced visible. */
export const WithArrows: Story = {
  args: { withArrows: true, forceArrowsVisible: true },
  render,
}
