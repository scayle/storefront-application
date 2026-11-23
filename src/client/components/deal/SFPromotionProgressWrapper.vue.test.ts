import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, toRefs } from 'vue'
import { createMockTieredPromotion } from '@test/mock-data/promotions'
import { t } from '@test/mocks/vue-i18n'
import { createMockStorefrontContext } from '@test/utils/context'
import SFPromotionProgressWrapper from './SFPromotionProgressWrapper.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      storefront: {
        country: createMockStorefrontContext().country,
      },
    },
  }),
}))

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const mockUseMOVPromotions = vi.fn()
vi.mock('@client/composables/useMOVPromotions', () => ({
  useMOVPromotions: (...args: unknown[]) => mockUseMOVPromotions(...args),
}))

interface MOVPromotionsState {
  progress: number
  tiers: Array<{ progress: number }>
  remaining: number
  isPromotionApplied: boolean
  complete: boolean
  discount?: string
}

/**
 * Makes `useMOVPromotions` return the given state as refs, the way the template
 * unwraps the real composable's computed values.
 */
function setMOVPromotionsState(state: MOVPromotionsState) {
  mockUseMOVPromotions.mockReturnValue(
    toRefs(reactive({ discount: undefined, milestones: [], ...state })),
  )
}

const mountWrapper = () =>
  mount(SFPromotionProgressWrapper, {
    props: { promotion: createMockTieredPromotion() },
    global: { mocks: { $t: t } },
  })

describe('SFPromotionProgressWrapper.vue', () => {
  it.for<{ message: string; state: MOVPromotionsState; expected: string }>([
    {
      message:
        'the remaining minimum order value while the first tier is not reached',
      state: {
        progress: 0.3,
        tiers: [{ progress: 0.3 }],
        remaining: 3500,
        isPromotionApplied: false,
        complete: false,
      },
      expected:
        'promotion_progress_wrapper.remaining_minimum_order_value({"amount":"$35.00"})',
    },
    {
      message: 'the fulfilled condition when a tier is reached but not applied',
      state: {
        progress: 1,
        tiers: [{ progress: 1 }],
        remaining: 0,
        isPromotionApplied: false,
        complete: false,
      },
      expected: 'promotion_progress_wrapper.fulfilled_promotion_condition',
    },
    {
      message: 'the full savings when every tier is reached and applied',
      state: {
        progress: 1,
        tiers: [{ progress: 1 }],
        remaining: 0,
        isPromotionApplied: true,
        complete: true,
        discount: '$15.00',
      },
      expected: 'promotion_progress_wrapper.full_savings({"amount":"$15.00"})',
    },
    {
      message:
        'the savings so far when a lower tier is applied but the highest is not reached',
      state: {
        progress: 0.7,
        tiers: [{ progress: 1 }, { progress: 0.4 }],
        remaining: 3000,
        isPromotionApplied: true,
        complete: false,
        discount: '$5.00',
      },
      expected:
        'promotion_progress_wrapper.partial_savings({"amount":"$5.00"})',
    },
  ])('shows $message', ({ state, expected }) => {
    setMOVPromotionsState(state)

    const wrapper = mountWrapper()

    expect(wrapper.text()).toContain(expected)
  })

  it('renders the progress bar at the reached share, named by the progress text', () => {
    setMOVPromotionsState({
      progress: 0.5,
      tiers: [{ progress: 0.5 }],
      remaining: 2500,
      isPromotionApplied: false,
      complete: false,
    })

    const wrapper = mountWrapper()

    const progressBar = wrapper.get('progress')
    expect(progressBar.attributes('value')).toBe('50')
    expect(progressBar.attributes('aria-label')).toBe(
      'promotion_progress_wrapper.remaining_minimum_order_value({"amount":"$25.00"})',
    )
  })

  // `useMOVPromotions` reports 0 before anything counts towards the first
  // tier, and the empty bar still shows how far the user has to go.
  it('renders the progress bar before anything counts towards the first tier', () => {
    setMOVPromotionsState({
      progress: 0,
      tiers: [{ progress: 0 }],
      remaining: 5000,
      isPromotionApplied: false,
      complete: false,
    })

    const wrapper = mountWrapper()

    expect(wrapper.get('progress').attributes('value')).toBe('0')
  })
})
