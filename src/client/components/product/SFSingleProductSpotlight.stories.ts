import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { DAY_MS } from '@client/utils/time'
import { createMockListingProduct } from '../../../test/mock-data/products'
import SFSingleProductSpotlight from './SFSingleProductSpotlight.vue'

/**
 * The CMS Single Product spotlight. It renders the standard product tile
 * (`SFProductCard`, as on PLPs and sliders). When High Urgency is enabled it
 * takes on the highlighted-deal treatment: colored border, countdown footer,
 * and an optional deal badge. It is driven by the editorial config.
 */
const meta = {
  title: 'Product/SFSingleProductSpotlight',
  component: SFSingleProductSpotlight,
  parameters: { layout: 'centered' },
  // Tiles render on the white page surface in the app; mirror that here.
  decorators: [
    () => ({
      template:
        '<div style="background:#fff;padding:24px;max-width:320px"><story /></div>',
    }),
  ],
} satisfies Meta<typeof SFSingleProductSpotlight>

export default meta
type Story = StoryObj<typeof SFSingleProductSpotlight>

const product = createMockListingProduct()

/** Normal state: a plain product tile, identical to PLP/slider tiles. */
export const Default: Story = {
  args: { product },
}

/** High urgency: colored border only, no badge and no countdown footer. */
export const HighUrgency: Story = {
  args: {
    product,
    highUrgency: true,
    backgroundColor: '#e3000b',
    textColor: '#ffffff',
  },
}

/** High urgency with an editorial deal badge. */
export const HighUrgencyWithBadge: Story = {
  args: {
    ...HighUrgency.args,
    badge: 'Staff Pick',
  },
}

/** High urgency with the countdown footer running. */
export const HighUrgencyWithCountdown: Story = {
  args: {
    ...HighUrgencyWithBadge.args,
    showCountdown: true,
    countdownEndDate: new Date(Date.now() + 3 * DAY_MS).toISOString(),
  },
}
