import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { usePage } from '@inertiajs/vue3'
import type {
  ProductPrice,
  VariantPrice,
  Campaign,
  Promotion,
} from '@scayle/storefront/types'
import { createMockVariantPrice } from '@test/mock-data/products'
import {
  createMockCampaign,
  createMockPromotion,
} from '@test/mock-data/promotions'
import SFPriceInfoModal from './SFPriceInfoModal.vue'

const { defaultPage, country } = vi.hoisted(() => {
  const country = { locale: 'en-US', currency: { currencyCode: 'EUR' } }
  return {
    country,
    defaultPage: {
      props: { storefront: { country } } as Record<string, unknown>,
    },
  }
})

vi.mock('@inertiajs/vue3', () => ({
  usePage: vi.fn(() => ({ ...defaultPage })),
}))

const t = (key: string, params?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    'price.information.headline': 'Price Information',
    'price.information.current_cost': 'How much this item currently costs:',
    'price.information.first_offered': 'First offered:',
    'price.information.lowest_30_days': 'Lowest in 30 days:',
    'price.information.see_in_basket': 'See the final price in the basket.',
    'price.information.campaign_label': 'Campaign "{name}":',
    'price.information.promotion_label': 'Promotion "{name}":',
    'price.starting_from': 'from',
    'price.sale_label': 'Sale:',
    'global.including_vat': 'including VAT',
    'global.excluding_vat': 'excluding VAT',
  }
  const template = map[key] ?? key
  return params
    ? template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''))
    : template
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t }),
}))

// Render the modal body inline without the native <dialog> machinery.
const SFModalStub = {
  name: 'SFModal',
  props: ['visible', 'headline', 'size'],
  template: '<div data-testid="modal"><slot /></div>',
}

function mountModal(
  price: VariantPrice | ProductPrice,
  {
    campaign,
    promotions,
  }: { campaign?: Campaign; promotions?: Promotion[] } = {},
) {
  vi.mocked(usePage).mockReturnValue({
    props: { storefront: { country }, ...(campaign ? { campaign } : {}) },
  } as unknown as ReturnType<typeof usePage>)
  return mount(SFPriceInfoModal, {
    props: { price, open: true, promotions },
    global: { mocks: { $t: t }, stubs: { SFModal: SFModalStub } },
  })
}

const campaign = createMockCampaign({
  name: '[Internal] Summer Deal',
  headline: 'Summer Deal',
})
const promotion = createMockPromotion({
  name: '[Internal] Flash Sale',
  headline: 'Flash Sale',
})

describe('SFPriceInfoModal.vue', () => {
  it('shows the current cost and original price when the mapper keeps the line', () => {
    const wrapper = mountModal(
      createMockVariantPrice({
        finalPrice: '€39.20',
        originalPrice: '€49.00',
        showOriginally: true,
      }),
    )

    expect(
      wrapper.find('[data-testid="price-info-row-current"]').text(),
    ).toContain('€39.20')
    expect(
      wrapper.find('[data-testid="price-info-row-original"]').text(),
    ).toContain('€49.00')
  })

  it('prefixes the current cost with "from" only when variant prices differ', () => {
    expect(
      mountModal(createMockVariantPrice())
        .find('[data-testid="price-info-row-current"]')
        .text(),
    ).not.toContain('from')

    const wrapper = mountModal({
      ...createMockVariantPrice(),
      hasDifferentPrices: true,
    })
    expect(
      wrapper.find('[data-testid="price-info-row-current"]').text(),
    ).toContain('from')
  })

  it('shows the lowest prior price row only when the mapper keeps the line', () => {
    expect(
      mountModal(
        createMockVariantPrice({
          showLowestPriorPriceLine: false,
          lowestPriorPrice: { withTax: '€45.00' },
        }),
      )
        .find('[data-testid="price-info-row-lowest"]')
        .exists(),
    ).toBe(false)

    const wrapper = mountModal(
      createMockVariantPrice({
        showLowestPriorPriceLine: true,
        lowestPriorPrice: { withTax: '€45.00' },
      }),
    )
    expect(
      wrapper.find('[data-testid="price-info-row-lowest"]').text(),
    ).toContain('€45.00')
  })

  it('shows the sale row only when on sale with a sale reduction', () => {
    expect(
      mountModal(
        createMockVariantPrice({ isOnSale: false, saleReductionInCents: 980 }),
      )
        .find('[data-testid="price-info-row-sale"]')
        .exists(),
    ).toBe(false)

    const wrapper = mountModal(
      createMockVariantPrice({ isOnSale: true, saleReductionInCents: 980 }),
    )
    expect(
      wrapper.find('[data-testid="price-info-row-sale"]').text(),
    ).toContain('-€9.80')
  })

  it('shows the campaign row with its headline when a campaign reduction is present', () => {
    const wrapper = mountModal(
      createMockVariantPrice({ campaignReductionInCents: 600 }),
      {
        campaign,
      },
    )
    const row = wrapper.find('[data-testid="price-info-row-campaign"]')

    expect(row.text()).toContain('Campaign "Summer Deal":')
    expect(row.text()).toContain('-€6.00')
  })

  it('lists a "see in basket" row per applicable (product-specific) promotion', () => {
    const wrapper = mountModal(createMockVariantPrice(), {
      promotions: [promotion],
    })
    const row = wrapper.find('[data-testid="price-info-row-promotion"]')

    expect(row.text()).toContain('Promotion "Flash Sale":')
    expect(row.text()).toContain('See the final price in the basket.')
  })
})
