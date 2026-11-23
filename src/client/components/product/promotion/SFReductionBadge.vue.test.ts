import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { BuyXGetYEffect, Promotion } from '@scayle/storefront/types'
import { createMockPromotion } from '@test/mock-data/promotions'
import SFReductionBadge from './SFReductionBadge.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

describe('SFReductionBadge.vue', () => {
  // The getPromotionReductionLabel tests cover the free, value and no-effect
  // labels. A free gift shows that the badge hands that function both the
  // promotion and the translation function.
  it('renders the reduction label of the promotion', () => {
    const promotion: Promotion<BuyXGetYEffect> = {
      ...createMockPromotion(),
      effect: {
        type: 'buy_x_get_y',
        eligibleItemsQuantity: 1,
        applicableItemSelectionType: 'variant_ids',
        variantIds: [1],
        discountType: 'relative',
        value: '-100%',
        isFree: true,
      },
    }

    const wrapper = mount(SFReductionBadge, { props: { promotion } })

    expect(wrapper.text()).toBe('promotion.free_label')
  })
})
