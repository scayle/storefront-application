import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFDealBadge from './SFDealBadge.vue'

/**
 * SFDealBadge labels a product that a promotion or campaign applies to.
 * Product cards (`SFBadges`) and basket items (`SFBasketCardImage`) render one
 * badge per deal, with the deal's badge label and colors.
 */
export default {
  title: 'Deal/SFDealBadge',
  component: SFDealBadge,
  parameters: { layout: 'centered' },
  args: { text: 'Deal' },
} satisfies Meta<typeof SFDealBadge>

type Story = StoryObj<typeof SFDealBadge>

/** Badge without a `style`, shown in the theme's primary color. */
export const Default: Story = {}

/** Badge in the label and colors a promotion is configured with. */
export const PromotionColors: Story = {
  args: {
    text: 'Summer Sale',
    style: { backgroundColor: '#FFC65F', color: '#171717' },
  },
}

/** Label wider than its container: the badge cuts it off with an ellipsis. */
export const LongLabel: Story = {
  args: { text: 'End of Season Sale on Selected Styles' },
  decorators: [() => ({ template: '<div class="w-32"><story /></div>' })],
}
