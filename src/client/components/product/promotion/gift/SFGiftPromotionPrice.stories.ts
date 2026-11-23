import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { BuyXGetYEffect, Promotion } from '@scayle/storefront/types'
import { createMockListingProduct } from '../../../../../test/mock-data/products'
import SFGiftPromotionPrice from './SFGiftPromotionPrice.vue'

const promotion: Promotion<BuyXGetYEffect> = {
  id: 'gift-promotion',
  name: 'Free Socks',
  priority: 1,
  headline: 'Buy shoes, get socks',
  link: '',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#aeecef', color: '#171717' },
  schedule: { from: '', to: '' },
  effect: {
    type: 'buy_x_get_y',
    eligibleItemsQuantity: 1,
    variantIds: [1],
    applicableItemSelectionType: 'variant_ids',
    discountType: 'relative',
    value: '-50%',
    isFree: false,
  },
}

/**
 * SFGiftPromotionPrice shows what a gift product costs under a Buy X Get Y
 * promotion: the reduction the promotion grants, and the price the gift would
 * cost without it. The gift selection and the promotion selection modal show it
 * for each gift product. A free gift only changes the reduction, which the
 * `Free` story of `SFReductionBadge` shows.
 */
export default {
  title: 'Product/Promotion/Gift/SFGiftPromotionPrice',
  component: SFGiftPromotionPrice,
  parameters: { layout: 'centered' },
  args: {
    price: createMockListingProduct().price,
    promotion,
  },
} satisfies Meta<typeof SFGiftPromotionPrice>

/** Gift at a reduced price: the effect's value above the original price. */
export const DiscountedGift: StoryObj<typeof SFGiftPromotionPrice> = {}
