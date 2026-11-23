import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import type { Promotion } from '@scayle/storefront/types'
import SFToastContainer from '@client/components/ui/toast/SFToastContainer.vue'
import SFBasketPromotionCodes from './SFBasketPromotionCodes.vue'

const now = new Date().toISOString()
const later = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

function promo(
  id: string,
  code: string,
  color: { backgroundColor: string; color: string },
): Promotion {
  return {
    id,
    code,
    name: code,
    priority: 1,
    headline: code,
    link: '',
    hideCountdown: true,
    conditions: '',
    color,
    schedule: { from: now, to: later },
  }
}

const summerPromo = promo('promo-summer-1', 'SUMMER10', {
  backgroundColor: '#fef3c7',
  color: '#92400e',
})

const welcomePromo = promo('promo-welcome-1', 'WELCOME5', {
  backgroundColor: '#dbeafe',
  color: '#1e40af',
})

const noCodes: Promotion[] = []

const oneCode: Promotion[] = [summerPromo]

const multipleCodes: Promotion[] = [summerPromo, welcomePromo]

/**
 * SFBasketPromotionCodes lets users add and remove promotion codes on the basket.
 * It shows a headline, an input with add button, and a list of applied codes with remove actions.
 *
 * Applied codes are passed in via the `promotion-codes` prop; the parent passes
 * `basket.promotionCodes`.
 */
export default {
  title: 'Basket/Promotions/SFBasketPromotionCodes',
  component: SFBasketPromotionCodes,
  render: (args: ComponentPropsAndSlots<typeof SFBasketPromotionCodes>) => ({
    components: { SFBasketPromotionCodes, SFToastContainer },
    setup: () => ({ args }),
    template: `<div><SFBasketPromotionCodes v-bind="args" /><SFToastContainer /></div>`,
  }),
} satisfies Meta<typeof SFBasketPromotionCodes>

type Story = StoryObj<typeof SFBasketPromotionCodes>

/**
 * Default state with no applied codes. User can type a code and add it via input or button.
 */
export const Default: Story = {
  args: { promotionCodes: noCodes },
}

/**
 * One promotion code applied (SUMMER10). Shows a single chip with remove action.
 */
export const WithOneCode: Story = {
  args: { promotionCodes: oneCode },
}

/**
 * Multiple promotion codes applied. Shows multiple chips with distinct colors and remove actions.
 */
export const WithMultipleCodes: Story = {
  args: { promotionCodes: multipleCodes },
}
