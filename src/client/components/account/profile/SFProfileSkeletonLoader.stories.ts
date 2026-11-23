import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFProfileSkeletonLoader from './SFProfileSkeletonLoader.vue'

/**
 * SFProfileSkeletonLoader is the placeholder for the account profile page
 * while the deferred `customer` prop resolves. It mirrors the page layout: the
 * headline block, the full-width account information card, and the personal
 * information and password cards side by side from the `lg` breakpoint.
 */
export default {
  title: 'Account/Profile/SFProfileSkeletonLoader',
  component: SFProfileSkeletonLoader,
} satisfies Meta<typeof SFProfileSkeletonLoader>

type Story = StoryObj<typeof SFProfileSkeletonLoader>

/** Loading state of the whole profile page. */
export const Default: Story = {}
