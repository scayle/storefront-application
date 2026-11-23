import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFCountdownSkeleton from './SFCountdownSkeleton.vue'

/**
 * SFCountdownSkeleton is the SSR placeholder for the Countdown Timer CMS
 * component. Because the countdown runs client-only, the server would otherwise
 * emit nothing and the timer would pop in on mount, shifting content below it.
 * This skeleton reserves the same footprint as the resolved variant during the
 * SSR-to-hydration gap.
 */
export default {
  title: 'UI/Core/SFCountdownSkeleton',
  component: SFCountdownSkeleton,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFCountdownSkeleton>

type Story = StoryObj<typeof SFCountdownSkeleton>

/**
 * Placeholder for the small (pill) variant.
 */
export const Small: Story = {
  args: {
    size: 'small',
  },
}

/**
 * Placeholder for the large (boxed cells) variant.
 */
export const Large: Story = {
  args: {
    size: 'large',
  },
}
