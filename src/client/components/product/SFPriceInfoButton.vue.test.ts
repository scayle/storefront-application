import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createOverlayTestPlugin } from '@test/utils/overlay'
import type { VariantPrice, Promotion } from '@scayle/storefront/types'
import SFPriceInfoButton from './SFPriceInfoButton.vue'

const mocks = { $t: (key: string) => key }

function buildVariantPrice(
  overrides: Partial<VariantPrice> = {},
): VariantPrice {
  return {
    finalPrice: '€27.01',
    currency: 'EUR',
    originalPrice: '€34.90',
    finalPriceInCents: 2701,
    originalPriceInCents: 3490,
    isOnSale: true,
    showOriginally: true,
    showLowestPriorPriceLine: false,
    strikeOriginally: true,
    strikeLowestPriorPrice: false,
    strikeThroughPrices: [],
    hasCampaignReduction: false,
    ...overrides,
  }
}

function buildPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'flash-sale',
    name: 'Flash Sale',
    priority: 1,
    headline: 'Flash Sale',
    link: '/promo/flash',
    hideCountdown: false,
    conditions: '',
    color: { backgroundColor: '#5328e1', color: '#ffffff' },
    schedule: { from: '2025-01-01T00:00:00Z', to: '2025-12-31T23:59:59Z' },
    ...overrides,
  }
}

const overlays = createOverlayTestPlugin()

function mountPriceInfoButton(props: {
  price: VariantPrice
  promotions: Promotion[]
}) {
  return mount(SFPriceInfoButton, {
    props,
    slots: { default: props.price.finalPrice },
    global: { mocks, plugins: [overlays.plugin] },
  })
}

describe('SFPriceInfoButton.vue', () => {
  it('renders the price display and announces the modal trigger', () => {
    const wrapper = mountPriceInfoButton({
      price: buildVariantPrice(),
      promotions: [],
    })

    expect(wrapper.text()).toContain('€27.01')
    expect(wrapper.find('[data-testid="price-info-trigger"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('button').attributes('aria-haspopup')).toBe('dialog')
    expect(wrapper.text()).toContain('price.info_trigger_a11y')
  })

  it('opens the price information modal with its own price and promotions', async () => {
    const price = buildVariantPrice()
    const promotions = [buildPromotion()]
    const wrapper = mountPriceInfoButton({ price, promotions })

    await wrapper.find('button').trigger('click')

    const [modal] = overlays.entries()
    expect(modal?.isOpen).toBe(true)
    expect(modal?.props()).toEqual({ price, promotions })
  })
})
