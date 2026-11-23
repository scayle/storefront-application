import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ListingProduct } from '@scayle/storefront/types'
import { createMockListingProduct } from '@test/mock-data/products'
import {
  createMockCampaign,
  createMockPromotion,
} from '@test/mock-data/promotions'
import SFBadges from './SFBadges.vue'

const campaign = createMockCampaign({ badgeLabel: 'Campaign' })

const promotion = createMockPromotion({
  product: { attributeId: 0, attributeGroupId: 0, badgeLabel: 'Promo' },
})

const highlightStyle = { backgroundColor: '#e3000b', color: '#ffffff' }

const stubs = {
  SFDealBadge: {
    props: ['text', 'style'],
    template: '<div data-testid="deal-badge">{{ text }}</div>',
  },
  SFProductBadge: true,
}

type BadgesProps = InstanceType<typeof SFBadges>['$props']

const mountBadges = (props: Partial<BadgesProps> = {}) =>
  mount(SFBadges, {
    props: {
      promotions: [],
      campaign: null,
      product: createMockListingProduct(),
      ...props,
    },
    global: {
      mocks: { $t: (key: string) => key },
      stubs,
    },
  })

const dealBadges = (wrapper: ReturnType<typeof mountBadges>) =>
  wrapper.findAll('[data-testid="deal-badge"]')

const productWithCampaignReduction = (): ListingProduct => {
  const product = createMockListingProduct()
  return { ...product, price: { ...product.price, hasCampaignReduction: true } }
}

describe('SFBadges highlight badge', () => {
  it('renders exactly one highlight deal badge when a highlight is active', () => {
    const wrapper = mountBadges({
      isHighlightActive: true,
      highlightBadgeStyle: highlightStyle,
      highlightBadgeLabel: 'Bundle deal',
    })

    const badges = dealBadges(wrapper)
    expect(badges).toHaveLength(1)
    expect(badges[0]?.text()).toBe('Bundle deal')
  })

  it('does not render a second badge when a highlight coincides with a campaign and promotions', () => {
    // Regression guard: previously both the highlight block and the
    // promotion/campaign badges rendered, producing duplicate deal badges.
    const wrapper = mountBadges({
      isHighlightActive: true,
      highlightBadgeStyle: highlightStyle,
      highlightBadgeLabel: 'Bundle deal',
      campaign,
      promotions: [promotion],
      product: productWithCampaignReduction(),
    })

    const badges = dealBadges(wrapper)
    expect(badges).toHaveLength(1)
    expect(badges[0]?.text()).toBe('Bundle deal')
  })

  it('falls back to the default "Deal" label when the highlight has no explicit label', () => {
    const wrapper = mountBadges({
      isHighlightActive: true,
      highlightBadgeStyle: highlightStyle,
    })

    const badges = dealBadges(wrapper)
    expect(badges).toHaveLength(1)
    expect(badges[0]?.text()).toBe('promotion.deal')
  })

  it('renders a border-only highlight (no badge) when the default badge is suppressed', () => {
    const wrapper = mountBadges({
      isHighlightActive: true,
      highlightBadgeStyle: highlightStyle,
      hideDefaultHighlightBadge: true,
    })

    expect(dealBadges(wrapper)).toHaveLength(0)
  })

  it('renders the campaign and promotion badges when no highlight is active', () => {
    const wrapper = mountBadges({
      campaign,
      promotions: [promotion],
      product: productWithCampaignReduction(),
    })

    const texts = dealBadges(wrapper).map((badge) => badge.text())
    expect(texts).toEqual(['Campaign', 'Promo'])
  })
})
