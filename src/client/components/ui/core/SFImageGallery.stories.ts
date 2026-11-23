import type { StoryObj, Meta } from '@storybook/vue3-vite'
import type { ImageSliderImage } from '@client/utils/constants'
import SFImageGallery from './SFImageGallery.vue'

const image = (path: string, alt: string, hash: string): ImageSliderImage => ({
  url: path,
  preset: 'detail',
  alt,
  hash,
})

const images: ImageSliderImage[] = [
  image('product-1-big.avif', 'Look 1', '1'),
  image('product-2-big.avif', 'Look 2', '2'),
  image('product-3-big.avif', 'Look 3', '3'),
]

/**
 * Slides with no source, exercising the error/empty placeholder. Uses an empty
 * `url` (rather than broken URLs) so the placeholder renders deterministically —
 * a 404 only resolves at runtime and never fires reliably in Storybook.
 */
const brokenImages: ImageSliderImage[] = [
  { url: '', preset: 'detail', alt: 'No image 1', hash: 'm1' },
  { url: '', preset: 'detail', alt: 'No image 2', hash: 'm2' },
  { url: '', preset: 'detail', alt: 'No image 3', hash: 'm3' },
]

/**
 * SFImageGallery is the design-system image carousel for the PDP main gallery
 * and zoom modal. It implements the full APG carousel ARIA pattern (region,
 * per-slide group semantics, `inert` on inactive slides, dots, prev/next with
 * `aria-controls`, a polite live region and keyboard navigation). Use the
 * `fullViewport` flag for the full-bleed zoom presentation.
 */
export default {
  title: 'UI/Core/SFImageGallery',
  component: SFImageGallery,
  parameters: { layout: 'centered' },
  argTypes: {
    fullViewport: { control: 'boolean' },
    isLoading: { control: 'boolean' },
    withArrows: { control: 'boolean' },
    withDots: { control: 'boolean' },
    images: { control: false },
  },
  args: {
    images,
    ariaLabel: 'Product image gallery',
  },
} satisfies Meta<typeof SFImageGallery>

type Story = StoryObj<typeof SFImageGallery>

const render = (width: string) => (args: Story['args']) => ({
  components: { SFImageGallery },
  setup() {
    return { args }
  },
  template: `
    <div class="${width}">
      <SFImageGallery v-bind="args" />
    </div>
  `,
})

/** Default — PDP gallery with dots and edge-spread chevrons. */
export const Default: Story = {
  render: render('aspect-product w-[420px]'),
}

/** Full viewport — one slide fills the container, clustered chevrons (zoom modal). */
export const FullViewport: Story = {
  args: { fullViewport: true },
  render: render('h-[600px] w-full'),
}

/** Skeleton — every slide renders a loading placeholder. */
export const Skeleton: Story = {
  args: { isLoading: true },
  render: render('aspect-product w-[420px]'),
}

/** Error / empty — failed sources fall back to the image placeholder. */
export const ErrorState: Story = {
  args: { images: brokenImages },
  render: render('aspect-product w-[420px]'),
}

/** Mobile — narrow viewport width. */
export const Mobile: Story = {
  render: render('aspect-product w-[320px]'),
}
