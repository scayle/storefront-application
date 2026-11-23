import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Campaign, Promotion } from '@scayle/storefront/types'
import type { PromotionPlacement } from '@client/utils/promotion'
import { useDealTracking } from './useDealTracking'

const promotionMocks = vi.hoisted(() => ({
  trackViewPromotion: vi.fn(),
  trackSelectPromotion: vi.fn(),
  trackViewCampaign: vi.fn(),
  trackSelectCampaign: vi.fn(),
}))

vi.mock('./usePromotionEvents', () => ({
  usePromotionEvents: () => ({
    trackViewPromotion: promotionMocks.trackViewPromotion,
    trackSelectPromotion: promotionMocks.trackSelectPromotion,
    trackViewCampaign: promotionMocks.trackViewCampaign,
    trackSelectCampaign: promotionMocks.trackSelectCampaign,
  }),
}))

const routeMocks = vi.hoisted(() => ({
  path: null as unknown as { value: string },
}))

vi.mock('@client/composables/useRoute', async () => {
  const { ref } = await import('vue')
  routeMocks.path = ref('/')
  return { useRoute: () => ({ path: routeMocks.path }) }
})

const promotion: Promotion = {
  id: 'promo-1',
  name: 'Summer Sale',
  headline: 'Up to 30% off',
  subline: 'Limited time',
  link: '/promotions/summer',
  priority: 1,
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#000', color: '#fff' },
  schedule: { from: '', to: '' },
}

const otherPromotion: Promotion = {
  ...promotion,
  id: 'promo-2',
  name: 'Winter Sale',
}

const campaign: Campaign = {
  id: 'camp-9',
  key: 'summer-campaign',
  name: 'Summer Campaign',
  reduction: 20,
  schedule: { from: '', to: '' },
  headline: 'Summer Sale',
  subline: 'Up to 20%',
  link: '/campaigns/summer',
  hideCountdown: false,
  color: { backgroundColor: '#000', color: '#fff' },
  conditions: '',
}

const placement = {
  component_type: 'basket_banner',
  position: 1,
  total: 2,
} as const

// Swapped by tests after mount to prove the getter is read at fire time, and
// set to `undefined` to stand in for a surface whose deferred deal set has not
// resolved yet. Reactive so resolving it re-runs the impression watcher.
const currentPlacement = shallowRef<PromotionPlacement | undefined>(placement)

let tracking!: ReturnType<typeof useDealTracking>

const Host = defineComponent({
  props: {
    deal: { type: Object as () => Promotion | Campaign, required: true },
  },
  setup(props) {
    tracking = useDealTracking(
      () => props.deal,
      () => currentPlacement.value,
    )
    return () => h('div')
  },
})

function mountHost(props: { deal: Promotion | Campaign }) {
  const wrapper = mount(Host, { props })
  return { wrapper, ...tracking }
}

beforeEach(() => {
  routeMocks.path.value = '/'
  currentPlacement.value = placement
})

describe('useDealTracking', () => {
  describe('onVisible', () => {
    it.for([
      {
        dealKind: 'promotion',
        deal: promotion,
        dispatch: 'trackViewPromotion',
        notDispatched: 'trackViewCampaign',
      },
      {
        dealKind: 'campaign',
        deal: campaign,
        dispatch: 'trackViewCampaign',
        notDispatched: 'trackViewPromotion',
      },
    ] as const)(
      'fires $dispatch when a $dealKind becomes visible',
      ({ deal, dispatch, notDispatched }) => {
        const { onVisible } = mountHost({ deal })

        onVisible(true)

        expect(promotionMocks[dispatch]).toHaveBeenCalledTimes(1)
        expect(promotionMocks[dispatch]).toHaveBeenCalledWith(deal, placement)
        expect(promotionMocks[notDispatched]).not.toHaveBeenCalled()
      },
    )

    it('does not fire on second visibility transition for the same deal (one-shot)', () => {
      const { onVisible } = mountHost({ deal: promotion })

      onVisible(true)
      onVisible(false)
      onVisible(true)

      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(1)
    })

    it('does not fire while not visible', () => {
      const { onVisible } = mountHost({ deal: promotion })

      onVisible(false)

      expect(promotionMocks.trackViewPromotion).not.toHaveBeenCalled()
    })

    it('resets the impression guard when the deal prop changes (persistent-layout swap)', async () => {
      const { wrapper, onVisible } = mountHost({ deal: promotion })

      onVisible(true)
      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(1)

      await wrapper.setProps({ deal: otherPromotion })

      onVisible(true)
      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(2)
      expect(promotionMocks.trackViewPromotion).toHaveBeenLastCalledWith(
        otherPromotion,
        placement,
      )
    })

    it('resets the impression guard when the page path changes (same deal across page views)', async () => {
      const { onVisible } = mountHost({ deal: promotion })

      onVisible(true)
      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(1)

      routeMocks.path.value = '/basket'
      await nextTick()

      onVisible(true)
      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(2)
    })

    it('reads the placement at impression time, not at setup', () => {
      const { onVisible } = mountHost({ deal: promotion })
      const shifted = {
        component_type: 'pdp_banner',
        position: 3,
        total: 4,
      } as const
      currentPlacement.value = shifted

      onVisible(true)

      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledWith(
        promotion,
        shifted,
      )
    })

    it('keeps the guard across reloads that leave the path alone (deferred props, pagination)', async () => {
      const { onVisible } = mountHost({ deal: promotion })

      onVisible(true)

      // A partial reload or a `?page=2` visit changes `page.url`, not the path.
      routeMocks.path.value = '/'
      await nextTick()

      onVisible(false)
      onVisible(true)
      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(1)
    })

    it('holds the impression while the surface reports no placement, then fires once it resolves', () => {
      currentPlacement.value = undefined
      const { onVisible } = mountHost({ deal: promotion })

      onVisible(true)
      expect(promotionMocks.trackViewPromotion).not.toHaveBeenCalled()

      // The PDP's deferred `promotions` prop landing. No new intersection
      // follows for a banner that never left the viewport, so the held
      // impression has to fire off the placement change itself.
      currentPlacement.value = placement

      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(1)
      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledWith(
        promotion,
        placement,
      )
    })

    it('does not report after a page change when only the placement is rebuilt', async () => {
      const { onVisible } = mountHost({ deal: promotion })

      onVisible(true)
      routeMocks.path.value = '/c/tops'
      await nextTick()
      currentPlacement.value = { ...placement }

      expect(promotionMocks.trackViewPromotion).toHaveBeenCalledTimes(1)
    })
  })

  describe('onSelect', () => {
    it.for([
      {
        dealKind: 'promotion',
        deal: promotion,
        dispatch: 'trackSelectPromotion',
        notDispatched: 'trackSelectCampaign',
      },
      {
        dealKind: 'campaign',
        deal: campaign,
        dispatch: 'trackSelectCampaign',
        notDispatched: 'trackSelectPromotion',
      },
    ] as const)(
      'fires $dispatch when a $dealKind link is clicked',
      ({ deal, dispatch, notDispatched }) => {
        const { onSelect } = mountHost({ deal })

        onSelect()

        expect(promotionMocks[dispatch]).toHaveBeenCalledTimes(1)
        expect(promotionMocks[dispatch]).toHaveBeenCalledWith(deal, placement)
        expect(promotionMocks[notDispatched]).not.toHaveBeenCalled()
      },
    )

    it('reads the placement at click time, not at setup', () => {
      const { onSelect } = mountHost({ deal: promotion })
      const shifted = {
        component_type: 'basket_banner',
        position: 2,
        total: 3,
      } as const
      currentPlacement.value = shifted

      onSelect()

      expect(promotionMocks.trackSelectPromotion).toHaveBeenCalledWith(
        promotion,
        shifted,
      )
    })

    it('does nothing when the deal has no link', () => {
      const { onSelect } = mountHost({ deal: { ...promotion, link: '' } })

      onSelect()

      expect(promotionMocks.trackSelectPromotion).not.toHaveBeenCalled()
      expect(promotionMocks.trackSelectCampaign).not.toHaveBeenCalled()
    })

    it('does nothing while the surface reports no placement', () => {
      currentPlacement.value = undefined
      const { onSelect } = mountHost({ deal: promotion })

      onSelect()

      expect(promotionMocks.trackSelectPromotion).not.toHaveBeenCalled()
      expect(promotionMocks.trackSelectCampaign).not.toHaveBeenCalled()
    })
  })
})
