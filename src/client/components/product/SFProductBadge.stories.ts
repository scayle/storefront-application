import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFProductBadge from './SFProductBadge.vue'

/**
 * SFProductBadge displays a single product badge with optional two-part label.
 * Used on product cards and gallery to show "New", storefront badge text, or a combined label (e.g. "New in | Sale").
 *
 * Key features:
 * - Accepts a single string or array of up to two strings
 * - Renders one label or two labels separated by a vertical divider
 * - Compact pill style with primary text and white background
 */
export default {
  title: 'Product/SFProductBadge',
  component: SFProductBadge,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFProductBadge>) => ({
    components: { SFProductBadge },
    setup() {
      return { args }
    },
    template: `<SFProductBadge v-bind="args" />`,
  }),
  argTypes: {
    text: {
      description: 'Single label or array of one or two labels to display',
      control: 'object',
    },
  },
} satisfies Meta<typeof SFProductBadge>

type Story = StoryObj<typeof SFProductBadge>

/**
 * Single label badge, e.g. a storefront badge or "Sale".
 */
export const Default: Story = {
  args: {
    text: 'Sale',
  },
}

/**
 * Two labels separated by a vertical divider, e.g. "New in" and "Limited".
 */
export const TwoLabels: Story = {
  args: {
    text: ['New in', 'Limited'],
  },
}

/**
 * Single label passed as a one-item array (same visual as Default).
 */
export const SingleLabelFromArray: Story = {
  args: {
    text: ['Storefront Badge'],
  },
}
