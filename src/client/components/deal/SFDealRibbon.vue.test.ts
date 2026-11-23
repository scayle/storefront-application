import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  createMockCampaign,
  createMockPromotion,
} from '@test/mock-data/promotions'
import { t } from '@test/mocks/vue-i18n'
import SFDealRibbon from './SFDealRibbon.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

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
})

/** The layout renders one ribbon, so it always reports the first of one. */
const ribbonPlacement = { component_type: 'ribbon', position: 1, total: 1 }

const defaultStubs = {
  ClientOnly: { template: '<div><slot /></div>' },
  SFCountdownSmall: {
    template: '<span data-testid="promotion-ribbon-timer" />',
  },
  SFCountdownSkeleton: {
    template: '<span data-testid="promotion-ribbon-timer-skeleton" />',
  },
  SFLink: { template: '<a><slot /></a>' },
}

describe('SFDealRibbon.vue', () => {
  it('renders deal headline and subline', () => {
    const deal = createMockPromotion({
      headline: 'Black Friday',
      subline: 'Limited time',
    })
    const wrapper = mount(SFDealRibbon, {
      props: { deal },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    expect(wrapper.text()).toContain('Black Friday')
    expect(wrapper.text()).toContain('Limited time')
  })

  it('gives the icon-only close button an accessible name', () => {
    const wrapper = mount(SFDealRibbon, {
      props: { deal: createMockPromotion() },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    // The only <button> is the close control; the deal itself is a link/div.
    const closeButton = wrapper.find('button')
    expect(closeButton.exists()).toBe(true)
    expect(closeButton.attributes('aria-label')).toBe('global.close')
  })

  it('hides the ribbon when the close button is clicked', async () => {
    const wrapper = mount(SFDealRibbon, {
      props: { deal: createMockPromotion() },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    const ribbon = () => wrapper.find('[data-testid="promotion-ribbon"]')
    expect(ribbon().exists()).toBe(true)

    await wrapper.find('button').trigger('click')

    expect(ribbon().exists()).toBe(false)
  })

  it('labels a linked deal with the visible text (headline · subline), no prefix', () => {
    const deal = createMockPromotion({
      headline: 'Summer Sale',
      subline: '50% off',
      link: '/promo',
    })
    const wrapper = mount(SFDealRibbon, {
      props: { deal },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    // The accessible name matches what's on screen so voice control can
    // activate it by the visible words (WCAG 2.5.3), with no "view promotion:"
    // prefix.
    expect(wrapper.find('a').attributes('aria-label')).toBe(
      'Summer Sale · 50% off',
    )
  })

  it('labels a linked deal without a subline with just the headline', () => {
    const deal = createMockPromotion({
      headline: 'Summer Sale',
      subline: '',
      link: '/promo',
    })
    const wrapper = mount(SFDealRibbon, {
      props: { deal },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    expect(wrapper.find('a').attributes('aria-label')).toBe('Summer Sale')
  })

  it('gives an unlinked deal no aria-label (only the close button is labelled)', () => {
    const deal = createMockPromotion({ link: '' })
    const wrapper = mount(SFDealRibbon, {
      props: { deal },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    // No link element at all when the deal has no link.
    expect(wrapper.find('a').exists()).toBe(false)
    // The only labelled control is the close button, never the ribbon body.
    const labelled = wrapper.findAll('[aria-label]')
    expect(labelled).toHaveLength(1)
    expect(labelled[0]!.attributes('aria-label')).toBe('global.close')
  })

  it('renders the countdown in the deal text color', () => {
    const deal = createMockCampaign({
      color: { backgroundColor: '#9a3b1e', color: '#fff3e3' },
      schedule: { from: '', to: '2026-11-15T22:59:59+00:00' },
    })
    const wrapper = mount(SFDealRibbon, {
      props: { deal },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    // SFCountdownSmall ships with `text-primary`, so the ribbon has to hand
    // it the campaign text color or the pill text contradicts the headline.
    const timer = wrapper.find<HTMLElement>(
      '[data-testid="promotion-ribbon-timer"]',
    )
    expect(timer.element.style.color).toBe('#fff3e3')
  })

  describe('tracking', () => {
    it('reports the impression as the only ribbon once it becomes visible', () => {
      const deal = createMockPromotion()
      mount(SFDealRibbon, {
        props: { deal },
        global: { stubs: defaultStubs, mocks: { $t: t } },
      })

      trackingMocks.visibilityCallbacks[0]!(true)

      expect(trackingMocks.trackViewPromotion).toHaveBeenCalledExactlyOnceWith(
        deal,
        ribbonPlacement,
      )
    })

    it('reports the selection as the only ribbon when the linked deal is clicked', async () => {
      const deal = createMockPromotion({ link: '/promo' })
      const wrapper = mount(SFDealRibbon, {
        props: { deal },
        global: { stubs: defaultStubs, mocks: { $t: t } },
      })

      await wrapper.get('a').trigger('click')

      expect(
        trackingMocks.trackSelectPromotion,
      ).toHaveBeenCalledExactlyOnceWith(deal, ribbonPlacement)
    })
  })
})
