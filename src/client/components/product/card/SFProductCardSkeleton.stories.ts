import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFProductCardSkeleton from './SFProductCardSkeleton.vue'

/**
 * SFProductCardSkeleton is the placeholder for one `SFProductCard` while the
 * products of a grid or slider are still loading. It mirrors the card's
 * layout: the image, a sibling swatch (below `lg` only), the brand and name
 * lines, and the price. It takes no props and fills the width of its parent.
 */
export default {
  title: 'Product/Card/SFProductCardSkeleton',
  component: SFProductCardSkeleton,
  parameters: { layout: 'centered' },
  render: () => ({
    components: { SFProductCardSkeleton },
    template: `
      <div class="w-64">
        <SFProductCardSkeleton />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductCardSkeleton>

type Story = StoryObj<typeof SFProductCardSkeleton>

/** The skeleton at the width of one card in a product grid. */
export const Default: Story = {}
