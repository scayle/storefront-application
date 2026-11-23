import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { Promotion, VariantPrice } from '@scayle/storefront/types'
import SFPriceInfoButton from './SFPriceInfoButton.vue'

const onSalePrice: VariantPrice = {
  finalPrice: '€27.01',
  originalPrice: '€34.90',
  finalPriceInCents: 2701,
  originalPriceInCents: 3490,
  currency: 'EUR',
  isOnSale: true,
  totalReduction: '-10%',
  showOriginally: true,
  showLowestPriorPriceLine: true,
  strikeOriginally: true,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  saleReduction: '€3.49',
  saleReductionInCents: 349,
  promotionReduction: '€0.00',
  lowestPriorPrice: { withTax: '€24.90' },
  tax: { amount: '€4.31', amountInCents: 431, rate: '19%' },
  strikeThroughPrices: [
    {
      value: '-10%',
      category: 'sale',
      type: 'relative',
      originalPrice: '€34.90',
    },
  ],
}

const flashSale: Promotion = {
  id: 'flash-sale',
  name: 'Flash Sale',
  priority: 1,
  headline: 'Flash Sale',
  link: '/promo/flash',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#5328e1', color: '#ffffff' },
  schedule: { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
}

/** The sr-only accessible name the trigger adds to the price text in the slot. */
const TRIGGER_NAME = /show price information/i

/**
 * SFPriceInfoButton is the price row of `SFProductPrice` that opens the Price
 * Information modal. The slot holds the price display; the modal opens through
 * `useOverlay()`, which the preview's `SFOverlayHost` renders next to the
 * story. The modal's content is covered in `Product/SFPriceInfoModal`.
 */
export default {
  title: 'Product/SFPriceInfoButton',
  component: SFPriceInfoButton,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFPriceInfoButton>) => ({
    components: { SFPriceInfoButton },
    setup() {
      return { args }
    },
    template: `
      <SFPriceInfoButton v-bind="args" class="text-xl font-semibold">
        {{ args.price.finalPrice }}
      </SFPriceInfoButton>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: TRIGGER_NAME }))
    // The overlay host renders the modal next to the story root, not inside it.
    const modal = within(document.body)
    await waitFor(() => expect(modal.getByRole('dialog')).toBeVisible())
    await expect(
      modal.getByText('How much this item currently costs:'),
    ).toBeVisible()
  },
} satisfies Meta<typeof SFPriceInfoButton>

type Story = StoryObj<typeof SFPriceInfoButton>

/** A discounted price: the modal breaks down the current, original, and last lowest price, plus the sale reduction. */
export const OnSale: Story = {
  args: {
    price: onSalePrice,
    promotions: [],
  },
}

/** The same price with a promotion: the modal adds a row that points to the basket, where the promotion applies. */
export const WithPromotions: Story = {
  args: {
    price: onSalePrice,
    promotions: [flashSale],
  },
}
