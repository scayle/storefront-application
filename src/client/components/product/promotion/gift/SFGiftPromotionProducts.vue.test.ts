import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type {
  DetailedProduct,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import {
  createMockDetailedProduct,
  createMockProductVariant,
} from '@test/mock-data/products'
import { createMockPromotion } from '@test/mock-data/promotions'
import SFGiftPromotionProducts from './SFGiftPromotionProducts.vue'

// Exposes the visibility ref of the most recently mounted panel, so tests can
// scroll it into view and exercise the tracking watcher.
const visibility = vi.hoisted(
  () => ({ ref: undefined }) as { ref: Ref<boolean> | undefined },
)

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useElementVisibility: () => {
      visibility.ref = ref(false)
      return visibility.ref
    },
  }
})

const tracking = vi.hoisted(() => ({
  trackViewItemList: vi.fn(),
  trackViewProductTile: vi.fn(),
  trackSelectItem: vi.fn(),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => tracking,
}))

const t = (key: string) => {
  if (key === 'buy_x_get_y_products.headline') {
    return 'Choose your gift'
  }
  if (key === 'buy_x_get_y_products.description') {
    return 'Pick a product below'
  }
  return key
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t }),
}))

const giftPromotion: Promotion<BuyXGetYEffect> = {
  ...createMockPromotion({ id: 'bxgy-1' }),
  effect: {
    type: 'buy_x_get_y',
    eligibleItemsQuantity: 1,
    applicableItemSelectionType: 'variant_ids',
    variantIds: [1],
    discountType: 'relative',
    value: '0%',
  },
}

// Two rewards so tests can assert a position other than the first; the second
// prices its own variant so the tile and select payloads can carry it.
function buildRewards() {
  return [
    createMockDetailedProduct({ id: 101, name: 'Gift A' }),
    createMockDetailedProduct({
      id: 102,
      variants: [createMockProductVariant({ id: 11 })],
    }),
  ]
}

function mountPanel(products?: DetailedProduct[]) {
  return mount(SFGiftPromotionProducts, {
    props: {
      giftPromotion: {
        promotion: giftPromotion,
        products: products ?? buildRewards().slice(0, 1),
      },
    },
    global: {
      mocks: { $t: t },
      stubs: {
        SFGiftPromotionProduct: {
          // Named so tests can reach the stub with `findAllComponents` and
          // emit the events the real tile emits.
          name: 'SFGiftPromotionProduct',
          template:
            '<div data-testid="bxgy-product" v-bind="$attrs"><slot /></div>',
          inheritAttrs: false,
        },
        SFProductPromotionSelectionModal: {
          name: 'SFProductPromotionSelectionModal',
          template: '<div data-testid="modal" />',
          props: ['product', 'promotion', 'visible'],
        },
      },
    },
  })
}

describe('SFGiftPromotionProducts.vue', () => {
  it('renders headline and lists gift products', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="headline"]').text()).toContain(
      'Choose your gift',
    )
    expect(wrapper.text()).toContain('Pick a product below')
    expect(wrapper.find('[data-testid="gift-item-101"]').exists()).toBe(true)
  })

  describe('tracking', () => {
    it('tracks the reward list once the panel scrolls into view', async () => {
      mountPanel()

      expect(tracking.trackViewItemList).not.toHaveBeenCalled()

      visibility.ref!.value = true
      await nextTick()

      expect(tracking.trackViewItemList).toHaveBeenCalledTimes(1)
      expect(tracking.trackViewItemList).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 101 })],
        {
          product_list_type: 'gift_selection',
          product_list_id: 'bxgy-1',
          total: 1,
        },
      )
    })

    it('tracks every reward tile with its position and priced variant when the panel becomes visible', async () => {
      const rewards = buildRewards()
      mountPanel(rewards)

      expect(tracking.trackViewProductTile).not.toHaveBeenCalled()

      visibility.ref!.value = true
      await nextTick()

      expect(tracking.trackViewProductTile).toHaveBeenCalledTimes(2)
      expect(tracking.trackViewProductTile).toHaveBeenLastCalledWith(
        rewards[1],
        {
          product_list_type: 'gift_selection',
          product_list_id: 'bxgy-1',
          total: 2,
          position: 2,
          variant: rewards[1]!.variants[0],
        },
      )
    })

    it('tracks a reward click with the position, total and variant of its tile impression', async () => {
      const rewards = buildRewards()
      const wrapper = mountPanel(rewards)

      await wrapper
        .findAllComponents({ name: 'SFGiftPromotionProduct' })[1]!
        .vm.$emit('selectItem')

      expect(tracking.trackSelectItem).toHaveBeenCalledTimes(1)
      expect(tracking.trackSelectItem).toHaveBeenCalledWith(rewards[1], {
        index: 2,
        product_list_type: 'gift_selection',
        product_list_id: 'bxgy-1',
        total: 2,
        variant: rewards[1]!.variants[0],
      })
    })

    it('reports the full reward count as the total', async () => {
      mountPanel(buildRewards())

      visibility.ref!.value = true
      await nextTick()

      expect(tracking.trackViewItemList).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ total: 2 }),
      )
    })
  })

  it('opens the selection modal for the clicked reward', async () => {
    const rewards = buildRewards()
    const wrapper = mountPanel(rewards)

    await wrapper
      .findAllComponents({ name: 'SFGiftPromotionProduct' })[1]!
      .vm.$emit('selectItem')
    await nextTick()

    const modal = wrapper.getComponent({
      name: 'SFProductPromotionSelectionModal',
    })
    expect(modal.props('visible')).toBe(true)
    expect(modal.props('product')).toEqual(rewards[1])
  })
})
