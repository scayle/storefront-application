import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type {
  Basket,
  BuyXGetYEffect,
  DetailedProduct,
  ProductVariant,
  Promotion,
} from '@scayle/storefront/types'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { createMockDetailedProduct } from '../../../../test/mock-data/products'
import SFProductPromotionSelectionModal from './SFProductPromotionSelectionModal.vue'

const promotion: Promotion<BuyXGetYEffect> = {
  id: 'free-jacket',
  name: 'Free Jacket',
  priority: 1,
  headline: 'Buy Two Items, Get a Free Jacket',
  link: '',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#aeecef', color: '#171717' },
  schedule: { from: '', to: '' },
  effect: {
    type: 'buy_x_get_y',
    eligibleItemsQuantity: 2,
    variantIds: [1, 2, 3],
    applicableItemSelectionType: 'variant_ids',
    discountType: 'relative',
    value: '-100%',
    isFree: true,
  },
}

const baseVariant = createMockDetailedProduct().variants[0]!

function createVariant(
  id: number,
  label: string,
  stock: number,
): ProductVariant {
  return { ...baseVariant, id, label, stock, isSoldOut: stock === 0 }
}

const gift: DetailedProduct = createMockDetailedProduct({
  variants: [
    createVariant(1, 'S', 10),
    createVariant(2, 'M', 10),
    createVariant(3, 'L', 0),
  ],
})

// `useBasket` opens the add-to-basket slide-in only for a basket line that grew
// during the add. The mocked reload hands back the same basket, so no line
// grows and the modal closes without opening the slide-in.
const basket: Basket = {
  availableItems: [],
  unavailableItems: [],
  itemCount: 0,
  promotionCodes: [],
  giftPromotions: [promotion],
  cost: {
    finalPrice: '$0.00',
    finalPriceInCents: 0,
    finalPriceWithoutTaxInCents: 0,
    subtotal: '$0.00',
    totalWithoutPromotionsInCents: 0,
    saleAndVoucherReductions: [],
    saleReductionSumInCents: 0,
    campaignReductionSumInCents: 0,
    promotionReductionSumInCents: 0,
    hasCampaignReduction: false,
    hasReductions: false,
    currency: 'USD',
    promotionReductionsPerPromotion: [],
  },
}

/**
 * SFProductPromotionSelectionModal lets the user pick the size of a free gift
 * and add it to the basket. `SFGiftPromotionProducts` opens it from the plus
 * button of a gift on the PDP and on the basket page.
 *
 * Key features:
 * - Shows the gift's image with a wishlist toggle, its brand, name and gift price
 * - Preselects the first size in stock, and opens the size list when the user
 *   adds the gift without a size
 * - Adds the selected size through `useBasket`, which reads the `basket` page
 *   prop, and reports `add_to_basket` with the `gift_selection` surface
 * - Links to the gift's PDP through the details button
 *
 * Every story seeds the `basket` page prop in `beforeEach`, and opens the
 * modal in its play function. The modal is a dialog, so on the docs page it
 * stays closed until the button is used.
 */
export default {
  title: 'Product/Promotion/SFProductPromotionSelectionModal',
  component: SFProductPromotionSelectionModal,
  parameters: { layout: 'centered' },
  args: {
    product: gift,
    promotion,
    visible: false,
  },
  argTypes: {
    visible: { control: false },
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, basket },
    })
  },
  render: (
    args: ComponentPropsAndSlots<typeof SFProductPromotionSelectionModal>,
  ) => ({
    components: { SFProductPromotionSelectionModal, SFButton },
    setup() {
      const isVisible = ref(args.visible ?? false)
      return { args, isVisible }
    },
    template: `
      <SFButton @click="isVisible = true">Choose gift</SFButton>
      <SFProductPromotionSelectionModal
        v-bind="args"
        v-model:visible="isVisible"
      />
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Choose gift' }))
    // The modal fades in and `toBeVisible` reads opacity, so the check waits
    // on the open state rather than on the end of the fade.
    await waitFor(() =>
      expect(
        canvas.getByTestId('promo-product-selection-modal'),
      ).toHaveAttribute('open'),
    )
  },
} satisfies Meta<typeof SFProductPromotionSelectionModal>

type Story = StoryObj<typeof SFProductPromotionSelectionModal>

/**
 * Gift with an image: the image sits on the left on desktop and above the
 * sizes on mobile, each with a wishlist toggle.
 */
export const GiftWithImage: Story = {}

/**
 * Gift without an image: the modal leaves out the image block, and with it the
 * wishlist toggle, which sits on the image.
 */
export const GiftWithoutImage: Story = {
  args: {
    product: { ...gift, images: [] },
  },
}

/**
 * Sold-out gift: every size is out of stock, so no size is preselected and the
 * add-to-basket button is disabled and reads "Sold out".
 */
export const SoldOutGift: Story = {
  args: {
    product: {
      ...gift,
      isSoldOut: true,
      variants: gift.variants.map((variant) =>
        createVariant(variant.id, variant.label, 0),
      ),
    },
  },
}
