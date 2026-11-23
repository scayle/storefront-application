import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { BuyXGetYEffect, Promotion } from '@scayle/storefront/types'
import SFReductionBadge from './SFReductionBadge.vue'

const discountEffect: BuyXGetYEffect = {
  type: 'buy_x_get_y',
  eligibleItemsQuantity: 1,
  variantIds: [1],
  applicableItemSelectionType: 'variant_ids',
  discountType: 'relative',
  value: '-50%',
  isFree: false,
}

function giftPromotion(effect: BuyXGetYEffect): Promotion<BuyXGetYEffect> {
  return {
    id: 'gift-promotion',
    name: 'Free Socks',
    priority: 1,
    headline: 'Buy shoes, get socks',
    link: '',
    hideCountdown: false,
    conditions: '',
    color: { backgroundColor: '#aeecef', color: '#171717' },
    schedule: { from: '', to: '' },
    effect,
  }
}

/**
 * SFReductionBadge shows the reduction a Buy X Get Y promotion grants on its
 * gift. The gift selection shows it next to each gift product through
 * `SFGiftPromotionPrice`.
 */
export default {
  title: 'Product/Promotion/SFReductionBadge',
  component: SFReductionBadge,
  parameters: { layout: 'centered' },
  args: { promotion: giftPromotion(discountEffect) },
} satisfies Meta<typeof SFReductionBadge>

type Story = StoryObj<typeof SFReductionBadge>

/** Gift at a reduced price: the badge shows the effect's formatted value. */
export const Discount: Story = {}

/** Free gift: the badge shows the localized free label instead of a value. */
export const Free: Story = {
  args: {
    promotion: giftPromotion({
      ...discountEffect,
      value: '-100%',
      isFree: true,
    }),
  },
}
