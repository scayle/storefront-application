import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import { Size } from '@client/utils/constants'
import SFQuantityInput from './SFQuantityInput.vue'

/**
 * SFQuantityInput is the `[−] [n] [+]` quantity control from the design system.
 * Used on product detail, basket line items, and order cards.
 *
 * Key features:
 * - Three sizes (Small, Medium, Large) with paired increment-button footprints
 * - `role="spinbutton"` with value/min/max exposed to assistive tech
 * - Container focus ring (keyboard focus on the spinbutton, not each button)
 * - Per-button disable at min/max quantity
 * - Skeleton state via `loading` while basket quantity updates
 */
export default {
  title: 'Product/SFQuantityInput',
  component: SFQuantityInput,
  parameters: { layout: 'centered' },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: [Size.SM, Size.MD, Size.LG],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    quantity: 2,
    maxQuantity: 5,
    minQuantity: 1,
    disabled: false,
    loading: false,
    size: Size.MD,
  },
  render: (args: ComponentPropsAndSlots<typeof SFQuantityInput>) => ({
    components: { SFQuantityInput },
    setup() {
      const quantity = ref(args.quantity)
      return { args, quantity }
    },
    template: `
      <SFQuantityInput
        v-model:quantity="quantity"
        :max-quantity="args.maxQuantity"
        :min-quantity="args.minQuantity"
        :disabled="args.disabled"
        :loading="args.loading"
        :size="args.size"
        :label="args.label"
      />
    `,
  }),
} satisfies Meta<typeof SFQuantityInput>

type Story = StoryObj<typeof SFQuantityInput>

/**
 * Default medium size with a mid-range quantity.
 */
export const Default: Story = {}

/**
 * Large size as used beside the variant picker on product detail.
 */
export const Large: Story = {
  args: {
    size: Size.LG,
    quantity: 2,
    maxQuantity: 10,
  },
}

/**
 * Small size for compact layouts.
 */
export const Small: Story = {
  args: {
    size: Size.SM,
    quantity: 2,
    maxQuantity: 5,
  },
}

/**
 * Whole control disabled (container and both buttons).
 */
export const Disabled: Story = {
  args: {
    quantity: 2,
    maxQuantity: 5,
    disabled: true,
  },
}

/**
 * Skeleton while a basket line item quantity is updating.
 */
export const Loading: Story = {
  args: {
    quantity: 2,
    maxQuantity: 5,
    loading: true,
  },
}

/**
 * At minimum quantity: decrement is disabled, increment stays enabled.
 */
export const AtMinQuantity: Story = {
  args: {
    quantity: 1,
    maxQuantity: 5,
    minQuantity: 1,
  },
}

/**
 * At maximum quantity: increment is disabled, decrement stays enabled.
 */
export const AtMaxQuantity: Story = {
  args: {
    quantity: 5,
    maxQuantity: 5,
  },
}
