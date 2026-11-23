import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFEmptyBasket from './SFEmptyBasket.vue'

/**
 * SFEmptyBasket is the empty state shown on the basket page when there are no items.
 * It displays an icon, headline, description, and actions to sign in or continue shopping.
 *
 * Key features:
 * - Uses i18n for title and description (basket_page.empty_basket_*)
 * - Primary action: sign in (routes.signin)
 * - Secondary action: continue shopping (routes.home)
 * - Default slot for extra content below the buttons
 */
export default {
  title: 'Basket/SFEmptyBasket',
  component: SFEmptyBasket,
  render: (args: ComponentPropsAndSlots<typeof SFEmptyBasket>) => ({
    components: { SFEmptyBasket },
    setup() {
      return { args }
    },
    template: `
      <SFEmptyBasket>
        <template v-if="args.default">{{ args.default }}</template>
      </SFEmptyBasket>
    `,
  }),
} satisfies Meta<typeof SFEmptyBasket>

type Story = StoryObj<typeof SFEmptyBasket>

/**
 * Default empty basket state as shown on the basket page when the basket has no items.
 */
export const Default = {
  args: {},
} satisfies Story

/**
 * Empty basket with extra content in the default slot (e.g. cross-sell or promotional message).
 */
export const WithSlotContent = {
  args: {
    default:
      'You might also like our bestsellers. Browse the collection below.',
  },
} satisfies Story
