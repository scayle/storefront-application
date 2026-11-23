import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type {
  Basket,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import { createMockBasket } from '@test/mock-data/basket'
import {
  createMockPromotion,
  createMockTieredPromotion,
} from '@test/mock-data/promotions'
import { t } from '@test/mocks/vue-i18n'
import SFDealBanner from './SFDealBanner.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const basketMock = vi.hoisted(() => ({
  value: undefined as Basket | undefined,
}))
vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({
    basket: basketMock,
    isGiftPromotionApplicable: (promotionId: string) =>
      basketMock.value?.giftPromotions.some(({ id }) => id === promotionId) ??
      false,
  }),
}))

const trackingMocks = vi.hoisted(() => ({
  trackViewPromotion: vi.fn(),
  trackSelectPromotion: vi.fn(),
  visibilityCallbacks: [] as Array<(visible: boolean) => void>,
}))

vi.mock('@client/composables/tracking/usePromotionEvents', () => ({
  usePromotionEvents: () => ({
    trackViewPromotion: trackingMocks.trackViewPromotion,
    trackSelectPromotion: trackingMocks.trackSelectPromotion,
    trackViewCampaign: vi.fn(),
    trackSelectCampaign: vi.fn(),
  }),
}))

// `useDealTracking` reads the page path, which the real `useRoute` takes from
// the Inertia page.
vi.mock('@client/composables/useRoute', async () => {
  const { ref } = await import('vue')
  return { useRoute: () => ({ path: ref('/') }) }
})

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useIntersectionObserver: (
      _target: unknown,
      callback: (entries: { isIntersecting: boolean }[]) => void,
    ) => {
      trackingMocks.visibilityCallbacks.push((visible: boolean) =>
        callback([{ isIntersecting: visible }]),
      )
      return { stop: vi.fn() }
    },
  }
})

beforeEach(() => {
  trackingMocks.visibilityCallbacks.length = 0
  basketMock.value = undefined
})

function basketWithReduction(deal: Promotion, total: string): Basket {
  const basket = createMockBasket()
  return createMockBasket({
    cost: {
      ...basket.cost,
      promotionReductionsPerPromotion: [
        {
          id: deal.id,
          name: deal.name,
          headline: deal.headline,
          color: deal.color,
          total,
          totalInCents: 500,
        },
      ],
    },
  })
}

const placement = {
  component_type: 'pdp_banner',
  position: 2,
  total: 3,
} as const

const defaultStubs = {
  ClientOnly: { template: '<div><slot /></div>' },
  SFCountdownSmall: { template: '<span data-testid="promotion-countdown" />' },
  SFCountdownSkeleton: {
    template: '<span data-testid="promotion-countdown-skeleton" />',
  },
  SFPromotionProgressWrapper: {
    template: '<div data-testid="mov-progress" />',
  },
  SFLink: { template: '<a><slot /></a>' },
  IconNotifyInfo: { template: '<span />' },
}

const mountBanner = (deal: Promotion) =>
  mount(SFDealBanner, {
    props: { deal, placement },
    global: { stubs: defaultStubs, mocks: { $t: t } },
  })

describe('SFDealBanner.vue', () => {
  it('shows the subline when the deal has one', () => {
    const wrapper = mountBanner(
      createMockPromotion({ subline: 'Up to 50% off' }),
    )

    expect(wrapper.text()).toContain('Up to 50% off')
  })

  it('shows locked text when promotion is not applied', () => {
    const wrapper = mountBanner(createMockPromotion())

    expect(wrapper.text()).toContain('promotion_banner.locked')
  })

  it('shows unlocked text with amount when basket has a reduction for this promotion (non-BXGY)', () => {
    const deal = createMockPromotion()
    basketMock.value = basketWithReduction(deal, '€5.00')

    const wrapper = mountBanner(deal)

    expect(wrapper.text()).toContain(
      'promotion_banner.unlocked({"amount":"€5.00"})',
    )
  })

  // The basket reports the gift as reduction only once it is in the basket, and
  // `giftPromotions` only while a gift can still be chosen. A second gift can be
  // earned after the first one, so both can be true at once.
  it.for([
    {
      state: 'the condition is met and no gift is chosen yet',
      hasReduction: false,
      isApplicable: true,
      expected: 'promotion_banner.unlocked_buy_x_get_y',
    },
    {
      state: 'the gift is in the basket',
      hasReduction: true,
      isApplicable: false,
      expected: 'promotion_banner.unlocked({"amount":"€5.00"})',
    },
    {
      state: 'the gift is in the basket and another one is earned',
      hasReduction: true,
      isApplicable: true,
      expected: 'promotion_banner.unlocked_buy_x_get_y',
    },
    {
      state: 'the condition is not met',
      hasReduction: false,
      isApplicable: false,
      expected: 'promotion_banner.locked',
    },
  ])(
    'shows the matching text when $state',
    ({ hasReduction, isApplicable, expected }) => {
      const deal = createMockPromotion()
      basketMock.value = {
        ...(hasReduction
          ? basketWithReduction(deal, '€5.00')
          : createMockBasket()),
        giftPromotions: isApplicable ? [deal as Promotion<BuyXGetYEffect>] : [],
      }

      const wrapper = mountBanner(deal)

      expect(wrapper.text()).toContain(expected)
    },
  )

  // The mapper turns a minimum-order-value-only promotion into one tier, so a
  // single tier has to reach the progress bar as well.
  it.for([
    { tierCount: 'several tiers', deal: createMockTieredPromotion() },
    {
      tierCount: 'a single tier',
      deal: createMockTieredPromotion({
        tiers: createMockTieredPromotion().tiers.slice(0, 1),
      }),
    },
  ])(
    'shows the minimum order value progress instead of the locked text for $tierCount',
    ({ deal }) => {
      const wrapper = mountBanner(deal)

      expect(wrapper.find('[data-testid="mov-progress"]').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('promotion_banner.locked')
    },
  )

  describe('tracking', () => {
    it('reports the impression with its deal and placement once the banner becomes visible', () => {
      const deal = createMockPromotion()
      mountBanner(deal)

      trackingMocks.visibilityCallbacks[0]!(true)

      expect(trackingMocks.trackViewPromotion).toHaveBeenCalledExactlyOnceWith(
        deal,
        placement,
      )
    })

    it('reports the selection with its deal and placement when the linked banner is clicked', async () => {
      const deal = createMockPromotion({ link: '/promo' })
      const wrapper = mountBanner(deal)

      await wrapper.trigger('click')

      expect(
        trackingMocks.trackSelectPromotion,
      ).toHaveBeenCalledExactlyOnceWith(deal, placement)
    })
  })
})
