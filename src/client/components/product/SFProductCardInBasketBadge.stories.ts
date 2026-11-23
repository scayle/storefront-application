import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import SFProductCardInBasketBadge from './SFProductCardInBasketBadge.vue'

const productId = 42

/**
 * SFProductCardInBasketBadge shows an "Already in basket" label when the product is in the
 * basket and the current page is not the basket page. Used on product cards to indicate
 * the item is already added. Basket state is read from the useBasket composable and requires
 * an Inertia page context to display.
 */
export default {
  title: 'Product/SFProductCardInBasketBadge',
  component: SFProductCardInBasketBadge,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFProductCardInBasketBadge>,
  ) => ({
    components: { SFProductCardInBasketBadge },
    setup() {
      return { args }
    },
    template: `<SFProductCardInBasketBadge v-bind="args" />`,
  }),
  argTypes: {
    productId: { control: 'number' },
  },
} satisfies Meta<typeof SFProductCardInBasketBadge>

type Story = StoryObj<typeof SFProductCardInBasketBadge>

export const Default: Story = {
  args: {
    productId,
  },
}
