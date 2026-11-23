import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockVariantPrice } from '@test/mock-data/products'
import { createOverlayTestPlugin } from '@test/utils/overlay'
import type { ProductPrice, VariantPrice } from '@scayle/storefront/types'
import SFProductPrice from './SFProductPrice.vue'

interface PriceProps {
  price: VariantPrice | ProductPrice
  showTaxInfo?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inline?: boolean
  showStrikeThroughPrice?: boolean
  showLowestPriorPrice?: boolean
}

vi.mock('@inertiajs/vue3', () => ({
  usePage: vi.fn(() => ({ props: {} })),
}))

const t = (key: string, params?: Record<string, string>) => {
  const map: Record<string, string> = {
    'price.starting_from': 'from',
    'price.originally': 'Originally:',
    'price.30_day_best_price': 'Last lowest price (30 days):',
    'price.info_trigger_a11y': 'Show price information',
    'price.original_price_a11y': `Original price ${params?.price ?? ''}`,
    'global.including_vat': 'including VAT',
    'global.excluding_vat': 'excluding VAT',
  }
  return map[key] ?? key
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t, locale: 'en-GB' }),
}))

const overlays = createOverlayTestPlugin()

const globalMocks = { $t: t }

const onSalePrice = {
  originalPrice: '110€',
  originalPriceInCents: 11000,
  isOnSale: true,
  totalReduction: '-10%',
  showOriginally: true,
  strikeOriginally: true,
} as const

function mountPrice(props: PriceProps) {
  return mount(SFProductPrice, {
    props,
    global: { mocks: globalMocks, plugins: [overlays.plugin] },
  })
}

describe('SFProductPrice.vue', () => {
  describe('final price color', () => {
    it('renders the final price in primary color when not on sale', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({ isOnSale: false }),
      })
      const final = wrapper.find('[data-testid="final-price"]')

      expect(final.classes()).toContain('text-primary')
      expect(final.classes()).not.toContain('text-product-sale')
    })

    it('renders the final price in sale red when on sale', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice(onSalePrice),
      })

      expect(wrapper.find('[data-testid="final-price"]').classes()).toContain(
        'text-product-sale',
      )
    })

    it('keeps grey-zone prices neutral even when original is higher', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          originalPrice: '110€',
          showOriginally: true,
          isOnSale: false,
        }),
      })
      const final = wrapper.find('[data-testid="final-price"]')

      expect(final.classes()).toContain('text-primary')
      expect(wrapper.find('[data-testid="originally-row"]').exists()).toBe(true)
    })

    it('prefixes "from" in primary color when prices differ across variants but are not on sale', () => {
      const wrapper = mountPrice({
        price: { ...createMockVariantPrice(), hasDifferentPrices: true },
      })
      const final = wrapper.find('[data-testid="final-price"]')

      expect(final.text()).toContain('from')
      expect(final.classes()).toContain('text-primary')
      expect(final.classes()).not.toContain('text-product-sale')
    })

    it('strikes the final price when showStrikeThroughPrice is set', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice(onSalePrice),
        showStrikeThroughPrice: true,
      })
      const final = wrapper.find('[data-testid="final-price"]')

      expect(final.classes()).toContain('line-through')
      expect(wrapper.find('[data-testid="originally-row"]').exists()).toBe(
        false,
      )
      expect(wrapper.find('[data-testid="price-info-trigger"]').exists()).toBe(
        false,
      )
    })
  })

  describe('originally row', () => {
    it('shows the original price struck with the total reduction when on sale', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice(onSalePrice),
      })
      const row = wrapper.find('[data-testid="originally-row"]')

      expect(row.exists()).toBe(true)
      expect(row.text()).toContain('Originally:')
      expect(row.text()).toContain('110€')
      expect(row.text()).toContain('-10%')
      expect(row.find('.line-through').exists()).toBe(true)
    })

    it('hides the original price when the mapper suppresses the line', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({ showOriginally: false }),
      })

      expect(wrapper.find('[data-testid="originally-row"]').exists()).toBe(
        false,
      )
    })
  })

  describe('price information trigger', () => {
    it('shows the info icon only when on sale and tax info is shown', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice(onSalePrice),
        showTaxInfo: true,
      })

      expect(wrapper.find('[data-testid="price-info-trigger"]').exists()).toBe(
        true,
      )
      expect(wrapper.find('[data-testid="price"]').element.tagName).toBe(
        'BUTTON',
      )
    })

    it('hides the info icon without tax info', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice(onSalePrice),
      })

      expect(wrapper.find('[data-testid="price-info-trigger"]').exists()).toBe(
        false,
      )
      expect(wrapper.find('[data-testid="price"]').element.tagName).toBe('P')
    })

    it('creates no overlay for a price that does not open the modal', () => {
      mountPrice({ price: createMockVariantPrice(onSalePrice) })

      expect(overlays.entries()).toEqual([])
    })

    it('opens the modal for its own price when the price row is clicked', async () => {
      const price = createMockVariantPrice(onSalePrice)
      const wrapper = mountPrice({ price, showTaxInfo: true })

      await wrapper.find('[data-testid="price"]').trigger('click')

      const [modal] = overlays.entries()
      expect(modal?.isOpen).toBe(true)
      expect(modal?.props()).toEqual({ price, promotions: [] })
    })
  })

  describe('tax info', () => {
    it('does not show tax info by default', () => {
      const wrapper = mountPrice({ price: createMockVariantPrice() })

      expect(wrapper.find('[data-testid="tax-info"]').exists()).toBe(false)
    })

    it('shows including VAT when a tax amount is present', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          tax: { amount: '€1.90', amountInCents: 190, rate: '19%' },
        }),
        showTaxInfo: true,
      })

      expect(wrapper.find('[data-testid="tax-info"]').text()).toBe(
        'including VAT',
      )
    })

    it('shows excluding VAT when the tax field is absent', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice(),
        showTaxInfo: true,
      })

      expect(wrapper.find('[data-testid="tax-info"]').text()).toBe(
        'excluding VAT',
      )
    })
  })

  describe('lowest prior price', () => {
    it('shows the LPL struck with the total reduction when that is the sale reference', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          isOnSale: true,
          totalReduction: '-25%',
          showLowestPriorPriceLine: true,
          strikeLowestPriorPrice: true,
          lowestPriorPrice: { withTax: '90€' },
        }),
        showLowestPriorPrice: true,
      })
      const row = wrapper.find('[data-testid="lowest-prior-price"]')

      expect(row.exists()).toBe(true)
      expect(row.text()).toContain('Last lowest price (30 days):')
      expect(row.text()).toContain('90€')
      expect(row.text()).toContain('-25%')
      expect(row.find('.line-through').exists()).toBe(true)
    })

    it('shows an LPL without strike-through in the grey zone when the mapper keeps the line', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          showLowestPriorPriceLine: true,
          lowestPriorPrice: { withTax: '90€' },
        }),
        showLowestPriorPrice: true,
      })
      const row = wrapper.find('[data-testid="lowest-prior-price"]')

      expect(row.exists()).toBe(true)
      expect(row.find('.line-through').exists()).toBe(false)
      expect(wrapper.find('[data-testid="total-reduction"]').exists()).toBe(
        false,
      )
    })

    it('hides the last lowest price when the mapper suppresses the line', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          showLowestPriorPriceLine: false,
          lowestPriorPrice: { withTax: '90€' },
        }),
        showLowestPriorPrice: true,
      })

      expect(wrapper.find('[data-testid="lowest-prior-price"]').exists()).toBe(
        false,
      )
    })

    it('hides the last lowest price when showLowestPriorPrice is not set', () => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          showLowestPriorPriceLine: true,
          lowestPriorPrice: { withTax: '90€' },
        }),
      })

      expect(wrapper.find('[data-testid="lowest-prior-price"]').exists()).toBe(
        false,
      )
    })
  })

  describe('with both reference lines shown', () => {
    type ReferenceLine = 'originally' | 'lowestPriorPrice'

    const referenceLineSelectors: Record<ReferenceLine, string> = {
      originally: '[data-testid="originally-row"]',
      lowestPriorPrice: '[data-testid="lowest-prior-price"]',
    }
    const referenceLines = Object.keys(
      referenceLineSelectors,
    ) as ReferenceLine[]

    function summarizeReferenceLines(wrapper: ReturnType<typeof mountPrice>) {
      const linesContaining = (selector: string) =>
        referenceLines.filter((line) =>
          wrapper.find(`${referenceLineSelectors[line]} ${selector}`).exists(),
        )

      return {
        onSale: wrapper
          .find('[data-testid="final-price"]')
          .classes()
          .includes('text-product-sale'),
        shown: referenceLines.filter((line) =>
          wrapper.find(referenceLineSelectors[line]).exists(),
        ),
        struck: linesContaining('.line-through'),
        reduction: linesContaining('[data-testid="total-reduction"]'),
      }
    }

    // Which line a sale is measured against is the mapper's decision, and the
    // SDK's `resolveSalePriceDisplay` tests cover every price constellation. The
    // component only renders the flags it receives, so the rows vary the flags.
    const onSale = { isOnSale: true, totalReduction: '-10%' } as const

    it.for<{
      name: string
      flags: Partial<VariantPrice>
      expected: ReturnType<typeof summarizeReferenceLines>
    }>([
      {
        name: 'strikes and badges only the original price when strikeOriginally is set',
        flags: { ...onSale, strikeOriginally: true },
        expected: {
          onSale: true,
          shown: ['originally', 'lowestPriorPrice'],
          struck: ['originally'],
          reduction: ['originally'],
        },
      },
      {
        name: 'strikes and badges only the lowest prior price when strikeLowestPriorPrice is set',
        flags: { ...onSale, strikeLowestPriorPrice: true },
        expected: {
          onSale: true,
          shown: ['originally', 'lowestPriorPrice'],
          struck: ['lowestPriorPrice'],
          reduction: ['lowestPriorPrice'],
        },
      },
      {
        name: 'strikes neither line and shows no reduction when no strike flag is set',
        flags: { ...onSale },
        expected: {
          onSale: true,
          shown: ['originally', 'lowestPriorPrice'],
          struck: [],
          reduction: [],
        },
      },
    ])('$name', ({ flags, expected }) => {
      const wrapper = mountPrice({
        price: createMockVariantPrice({
          showOriginally: true,
          showLowestPriorPriceLine: true,
          lowestPriorPrice: { withTax: '€12.00' },
          ...flags,
        }),
        showLowestPriorPrice: true,
      })

      expect(summarizeReferenceLines(wrapper)).toEqual(expected)
    })
  })
})
