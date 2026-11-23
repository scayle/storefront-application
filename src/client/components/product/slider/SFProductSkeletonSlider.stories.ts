import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFProductSkeletonSlider from './SFProductSkeletonSlider.vue'

/**
 * SFProductSkeletonSlider is a loading placeholder for SFProductSlider.
 * It renders 4 animated skeleton product cards inside the same slider shell,
 * giving users visual feedback while real product data is being fetched.
 * Use it as a drop-in replacement for SFProductSlider during deferred/lazy loads.
 */
export default {
  title: 'Product/Slider/SFProductSkeletonSlider',
  component: SFProductSkeletonSlider,
  render: () => ({
    components: { SFProductSkeletonSlider },
    template: `
      <div class="w-full max-w-4xl p-6 bg-gray-100">
        <SFProductSkeletonSlider />
      </div>
    `,
  }),
} satisfies Meta<typeof SFProductSkeletonSlider>

type Story = StoryObj<typeof SFProductSkeletonSlider>

/**
 * The default skeleton state: 4 placeholder cards with a title skeleton,
 * matching the layout of a fully loaded SFProductSlider.
 */
export const Default: Story = {}
