import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFCountBadge from './SFCountBadge.vue'

/**
 * SFCountBadge is the unified counter pill used across the storefront for small
 * numeric indicators: header utility icons (wishlist, basket, deals), the
 * filter toggle button, and filter group headers. It hides itself when the
 * count is 0.
 */
export default {
  title: 'UI/Core/SFCountBadge',
  component: SFCountBadge,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['inline', 'corner'] },
  },
  render: (args: ComponentPropsAndSlots<typeof SFCountBadge>) => ({
    components: { SFCountBadge },
    setup() {
      return { args }
    },
    template: `
      <div class="relative inline-flex size-11 items-center justify-center rounded-md bg-gray-100 p-4">
        <SFCountBadge v-bind="args" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFCountBadge>

type Story = StoryObj<typeof SFCountBadge>

/** Inline pill, the default placement (filter button, filter group header). */
export const Inline: Story = {
  args: { count: 5, variant: 'inline' },
}

/** Corner overlay anchored to the top-right of a `relative` parent (icon buttons). */
export const Corner: Story = {
  args: { count: 5, variant: 'corner' },
}

/** Multi-digit counts widen the pill while keeping it pill-shaped. */
export const MultiDigit: Story = {
  args: { count: 99, variant: 'corner' },
}

/** Hidden entirely when the count is 0. */
export const Hidden: Story = {
  args: { count: 0, variant: 'corner' },
}
