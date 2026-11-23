import { nextTick } from 'vue'
import type { Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactivePageMock } from '@test/utils/inertia'
import {
  SFEmptyBasketStub,
  SFBasketCardStub,
  SFBasketDeleteConfirmationModalStub,
} from '@test/stubs/basket'

import Basket from './Basket.vue'

const removeItemMock = vi.fn()
const updateItemQuantityMock = vi.fn()
const changeItemVariantMock = vi.fn()

interface BasketStubItem {
  key: string
  quantity: number
  product: { name: string }
  /** The line's current variant. Read to locate a line by the size it holds. */
  variant: { id: number }
  variants: { id: number; label: string }[]
  /**
   * Carrying a subscription definition renders the line without a size picker,
   * the rule the real card applies. Absent means the line offers one.
   */
  customData?: { subscriptionDefinition?: { subscriptionInterval: string } }
  /**
   * Groups lines that belong together (a bundle, a subscription). A size change
   * carries the changed line's group onto the line that replaces it, so the
   * group tells two lines holding the same variant apart.
   */
  itemGroup?: { id: number }
}

interface BasketStub {
  availableItems: BasketStubItem[]
  unavailableItems: BasketStubItem[]
  cost?: { hasCampaignReduction: boolean }
  itemCount: number
}

/**
 * Builds a basket stub whose `itemCount` agrees with the lines it holds. The
 * page renders from the server-supplied count, so a fixture that names lines
 * without counting them would render as an empty basket.
 */
function createBasketStub(
  availableItems: BasketStub['availableItems'] = [],
  unavailableItems: BasketStub['unavailableItems'] = [],
): BasketStub {
  return {
    availableItems,
    unavailableItems,
    itemCount: [...availableItems, ...unavailableItems].reduce(
      (total, item) => total + item.quantity,
      0,
    ),
  }
}

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  // Reactive refs (assigned in the useBasket mock factory) so that mutating the
  // basket inside `removeItem` re-renders the list — required for focus tests.
  basketRef: null as Ref<BasketStub | undefined> | null,
  bannersRef: null as Ref<{ id: string }[] | undefined> | null,
}))

vi.mock('@client/composables/useBasket', async () => {
  const { ref: vueRef } = await import('vue')
  mocks.basketRef = vueRef<BasketStub | undefined>(undefined)
  return {
    useBasket: () => ({
      updateItemQuantity: updateItemQuantityMock,
      changeItemVariant: changeItemVariantMock,
      removeItem: removeItemMock,
      basket: mocks.basketRef,
    }),
  }
})

vi.mock('@client/composables/useBasketPromotionBanners', async () => {
  const { ref: vueRef } = await import('vue')
  mocks.bannersRef = vueRef<{ id: string }[] | undefined>([])
  return {
    useBasketPromotionBanners: () => ({ banners: mocks.bannersRef }),
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, named?: Record<string, unknown>) =>
      named ? `${key}:${JSON.stringify(named)}` : key,
  }),
}))

const basketEvents = vi.hoisted(() => ({
  trackAddToBasket: vi.fn(),
  trackRemoveFromBasket: vi.fn(),
  trackViewBasket: vi.fn(),
}))
vi.mock('@client/composables/tracking/useBasketEvents', () => ({
  useBasketEvents: () => basketEvents,
}))

// Basket mutations announce through the shared announcer; assert against the spy.
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }))
vi.mock('@client/composables/useAnnouncer', () => ({
  useAnnouncer: () => ({ announce }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')

  mocks.reactivePage = createReactivePage(
    { campaign: null },
    { component: 'Basket' },
  )

  return {
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

const baseProps = {
  accessToken: 'test-token',
  checkoutJwt: 'test-jwt',
  deliveryCosts: {
    value: 'from €0.00',
    disclaimer: '* Delivery fees will be determined during checkout',
  },
  giftPromotions: [],
  meta: {
    title: 'Basket',
    description: 'Review your items and continue to checkout.',
    robots: 'noindex, nofollow',
  },
}

const defaultGlobal = {
  stubs: {
    SFBasketPromotionCodes: true,
    SFBasketHeadline: true,
    SFEmptyBasket: SFEmptyBasketStub,
    SFExpressCheckoutBasket: true,
    SFBasketCard: SFBasketCardStub,
    SFBasketDeleteConfirmationModal: SFBasketDeleteConfirmationModalStub,
    SFBasketSummary: true,
    SFDealBanner: true,
    SFGiftPromotionProducts: true,
    PageMetaHead: true,
  },
  mocks: {
    $t: (key: string) => key,
  },
}

// The focus-restoration tests attach to the document body; unmount them even
// when an assertion fails, so the next test starts with a clean document.
const mountedWrappers: VueWrapper[] = []

/**
 * Mounts the page through a host component that binds the basket ref to the
 * page's own `basket` prop.
 *
 * The page renders from that prop rather than from `useBasket()`, since the
 * controller supplies a basket carrying each line's selectable variants while
 * the shared prop omits them. Binding the ref keeps the control flow these
 * tests already use: assigning `mocks.basketRef.value` still re-renders.
 */
function mountBasket({
  props,
  global = defaultGlobal,
  ...mountOptions
}: {
  props: Record<string, unknown>
  global?: Record<string, unknown>
  [option: string]: unknown
}) {
  const wrapper = mount(
    {
      components: { Basket },
      setup: () => ({ pageProps: props, basket: mocks.basketRef }),
      template: '<Basket v-bind="pageProps" :basket="basket" />',
    },
    { global, ...mountOptions },
  )
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('Basket page', () => {
  beforeEach(() => {
    removeItemMock.mockReset()
    removeItemMock.mockResolvedValue({ success: true })
    updateItemQuantityMock.mockReset()
    updateItemQuantityMock.mockResolvedValue(true)
    changeItemVariantMock.mockReset()
    changeItemVariantMock.mockResolvedValue({ success: true })
    announce.mockReset()
    mocks.basketRef!.value = createBasketStub([
      {
        key: 'item-key',
        quantity: 1,
        product: { name: 'Test product' },
        variant: { id: 1 },
        variants: [{ id: 999, label: 'L' }],
      },
    ])
    mocks.bannersRef!.value = []
    mocks.reactivePage!.props.campaign = null
  })

  afterEach(() => {
    while (mountedWrappers.length) {
      mountedWrappers.pop()?.unmount()
    }
  })

  // Row 211: the modal flow split into one test per behavior.
  it('asks for confirmation before removing a line', async () => {
    const wrapper = mountBasket({ props: baseProps })

    expect(wrapper.find('[data-testid="delete-confirm-modal"]').exists()).toBe(
      false,
    )

    await wrapper
      .get('[data-testid="basket-remove-item-button"]')
      .trigger('click')

    expect(wrapper.find('[data-testid="delete-confirm-modal"]').exists()).toBe(
      true,
    )
  })

  it('removes nothing when the customer cancels the confirmation', async () => {
    const wrapper = mountBasket({ props: baseProps })

    await wrapper
      .get('[data-testid="basket-remove-item-button"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="basket-remove-item-cancel-button"]')
      .trigger('click')

    expect(wrapper.find('[data-testid="delete-confirm-modal"]').exists()).toBe(
      false,
    )
    await flushPromises()

    expect(removeItemMock).not.toHaveBeenCalled()
  })

  it('removes the confirmed line', async () => {
    const wrapper = mountBasket({ props: baseProps })

    await wrapper
      .get('[data-testid="basket-remove-item-button"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="basket-remove-item-confirm-button"]')
      .trigger('click')

    expect(wrapper.find('[data-testid="delete-confirm-modal"]').exists()).toBe(
      false,
    )
    await flushPromises()

    expect(removeItemMock).toHaveBeenCalledExactlyOnceWith({
      itemKey: 'item-key',
    })
  })

  it('fires view_basket once on mount when the basket is already present', async () => {
    mountBasket({ props: baseProps })
    await flushPromises()

    expect(basketEvents.trackViewBasket).toHaveBeenCalledTimes(1)

    // A later basket change is not a new basket view.
    mocks.basketRef!.value = createBasketStub()
    await flushPromises()

    expect(basketEvents.trackViewBasket).toHaveBeenCalledTimes(1)
  })

  // The prop ships with the first response, so the page normally has a basket
  // on mount. A reload can still swap it, and the event must not fire again.
  it('fires view_basket once when the basket arrives after mount', async () => {
    mocks.basketRef!.value = undefined
    mountBasket({ props: baseProps })
    await flushPromises()

    expect(basketEvents.trackViewBasket).not.toHaveBeenCalled()

    mocks.basketRef!.value = createBasketStub([
      {
        key: 'item-key',
        quantity: 1,
        product: { name: 'Test product' },
        variant: { id: 1 },
        variants: [],
      },
    ])
    await flushPromises()

    expect(basketEvents.trackViewBasket).toHaveBeenCalledTimes(1)

    mocks.basketRef!.value = createBasketStub()
    await flushPromises()

    expect(basketEvents.trackViewBasket).toHaveBeenCalledTimes(1)
  })

  it('leaves the quantity-change events to useBasket', async () => {
    const wrapper = mountBasket({ props: baseProps })

    await wrapper.get('[data-testid="basket-quantity-button"]').trigger('click')
    await flushPromises()

    // `useBasket().updateItemQuantity` fires add_to_basket / remove_from_basket
    // itself; a second call from the page would double the event.
    expect(updateItemQuantityMock).toHaveBeenCalledTimes(1)
    expect(basketEvents.trackAddToBasket).not.toHaveBeenCalled()
    expect(basketEvents.trackRemoveFromBasket).not.toHaveBeenCalled()
  })

  // The page owns the change: the card and the selector under it only report
  // the pick. A selector that mutated as well would run the change twice, and
  // the second run would miss the line the first one replaced.
  it('changes the line variant exactly once per pick', async () => {
    const wrapper = mountBasket({ props: baseProps })

    await wrapper.get('[data-testid="basket-size-button"]').trigger('click')
    await flushPromises()

    expect(changeItemVariantMock).toHaveBeenCalledTimes(1)
    expect(changeItemVariantMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'item-key' }),
      999,
    )
  })

  it('ignores further quantity updates while one is in flight', async () => {
    let resolveUpdate: (value: boolean) => void = () => {}
    updateItemQuantityMock.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveUpdate = resolve
        }),
    )

    const wrapper = mountBasket({ props: baseProps })
    const quantityButton = wrapper.get('[data-testid="basket-quantity-button"]')

    await quantityButton.trigger('click')
    await nextTick()
    await quantityButton.trigger('click')
    await quantityButton.trigger('click')

    expect(updateItemQuantityMock).toHaveBeenCalledTimes(1)

    resolveUpdate(true)
    await flushPromises()
  })

  // Row 215: the unavailable section rendered from real unavailable lines.
  it('renders the unavailable products with their own section', () => {
    mocks.basketRef!.value = createBasketStub(
      [
        {
          key: 'item-key',
          quantity: 1,
          product: { name: 'Test product' },
          variant: { id: 1 },
          variants: [{ id: 999, label: 'L' }],
        },
      ],
      [
        {
          key: 'unavailable-key',
          quantity: 2,
          product: { name: 'Unavailable product' },
          variant: { id: 3 },
          variants: [],
        },
      ],
    )

    const wrapper = mountBasket({ props: baseProps })

    const headline = wrapper.get(
      '[data-testid="headline-unavailable-products"]',
    )
    expect(headline.text()).toContain('basket.unavailable_products')

    const list = wrapper.get('[data-testid="unavailable-product-list"]')
    expect(list.findAll('[data-item-key="unavailable-key"]')).toHaveLength(1)
    // The lines carry their removal controls, like the available ones do.
    expect(
      list.findAll('[data-testid="basket-remove-item-button"]'),
    ).toHaveLength(1)
    expect(headline.attributes('id')).toBe(list.attributes('aria-labelledby'))
  })

  // Row 216: the gift promotion list rendered from the page prop.
  it('renders one gift promotion panel per gift promotion', () => {
    const wrapper = mountBasket({
      props: {
        ...baseProps,
        giftPromotions: [{ promotion: { id: 'gift-1' }, products: [] }],
      },
      global: {
        ...defaultGlobal,
        stubs: {
          ...defaultGlobal.stubs,
          SFGiftPromotionProducts: {
            props: ['giftPromotion'],
            template:
              '<div data-testid="gift-promotion" :data-promotion-id="giftPromotion.promotion.id" />',
          },
        },
      },
    })

    const panels = wrapper.findAll('[data-testid="gift-promotion"]')
    expect(panels).toHaveLength(1)
    expect(panels[0]!.attributes('data-promotion-id')).toBe('gift-1')
  })

  // Row 217: the empty basket reached through the render itself, not only
  // after removing the last line.
  it('renders the empty basket when the basket holds no items', () => {
    mocks.basketRef!.value = createBasketStub()

    const wrapper = mountBasket({ props: baseProps })

    expect(wrapper.find('[data-testid="empty-basket"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="basket-card"]').exists()).toBe(false)
  })

  // Row 218: the summary receives the checkout wiring the page passes through.
  it('passes the checkout wiring to the basket summary', () => {
    const wrapper = mountBasket({
      props: baseProps,
      global: {
        ...defaultGlobal,
        stubs: {
          ...defaultGlobal.stubs,
          SFBasketSummary: {
            props: ['basket', 'deliveryCosts', 'accessToken', 'checkoutJwt'],
            template:
              '<div data-testid="basket-summary" :data-access-token="accessToken" :data-checkout-jwt="checkoutJwt" :data-delivery-costs="deliveryCosts.value" />',
          },
        },
      },
    })

    const summary = wrapper.get('[data-testid="basket-summary"]')
    expect(summary.attributes('data-access-token')).toBe('test-token')
    expect(summary.attributes('data-checkout-jwt')).toBe('test-jwt')
    expect(summary.attributes('data-delivery-costs')).toBe('from €0.00')
  })

  // Focus wiring guard: the composables own the restoration logic (tested in
  // useBasketItemFocus.vue.test.ts); this asserts the page hands them the
  // rendered cards, so a removed line's neighbor takes the focus.
  it('restores focus to an adjacent remove button after removal', async () => {
    mocks.basketRef!.value = createBasketStub([
      {
        key: 'item-1',
        quantity: 1,
        product: { name: 'First' },
        variant: { id: 1 },
        variants: [],
      },
      {
        key: 'item-2',
        quantity: 1,
        product: { name: 'Second' },
        variant: { id: 2 },
        variants: [],
      },
    ])

    // Mimic the real reload: the removed item leaves the basket on success.
    removeItemMock.mockImplementation(
      async ({ itemKey }: { itemKey: string }) => {
        mocks.basketRef!.value = createBasketStub(
          (mocks.basketRef!.value?.availableItems ?? []).filter(
            (entry) => entry.key !== itemKey,
          ),
        )
        return { success: true }
      },
    )

    const wrapper = mountBasket({
      props: baseProps,
      global: defaultGlobal,
      attachTo: document.body,
    })

    // Remove the first item.
    await wrapper.get('[data-item-key="item-1"]').trigger('click')
    await wrapper
      .get('[data-testid="basket-remove-item-confirm-button"]')
      .trigger('click')
    await flushPromises()

    const remaining = wrapper.get('[data-item-key="item-2"]')
    expect(document.activeElement).toBe(remaining.element)
  })

  // Focus wiring guard for the empty-basket swap: the page hands the
  // composable the rendered `SFEmptyBasket`, whose CTA takes the focus.
  it('moves focus to the empty-basket CTA after the last item is removed', async () => {
    // Mimic the real reload: removing the only item empties the basket, so the
    // page swaps in SFEmptyBasket and focus should land on its primary CTA.
    removeItemMock.mockImplementation(async () => {
      mocks.basketRef!.value = createBasketStub()
      return { success: true }
    })

    const wrapper = mountBasket({
      props: baseProps,
      global: defaultGlobal,
      attachTo: document.body,
    })

    await wrapper
      .get('[data-testid="basket-remove-item-button"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="basket-remove-item-confirm-button"]')
      .trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(
      wrapper.get('[data-testid="empty-basket-cta"]').element,
    )
  })

  describe('deal banner placement', () => {
    const placementGlobal = {
      ...defaultGlobal,
      stubs: {
        ...defaultGlobal.stubs,
        SFDealBanner: {
          props: ['deal', 'placement'],
          template:
            '<div data-testid="deal-banner" :data-component-type="placement?.component_type" :data-position="placement?.position" :data-total="placement?.total" />',
        },
      },
    }

    const readPlacements = (wrapper: ReturnType<typeof mount>) =>
      wrapper
        .findAll('[data-testid="deal-banner"]')
        .map((banner) => [
          banner.attributes('data-component-type'),
          banner.attributes('data-position'),
          banner.attributes('data-total'),
        ])

    it('places every banner as a basket_banner with its position among all deals', () => {
      mocks.reactivePage!.props.campaign = { id: 'c-1' }
      mocks.basketRef!.value = {
        ...mocks.basketRef!.value!,
        cost: { hasCampaignReduction: true },
      }

      mocks.bannersRef!.value = [{ id: 'a' }, { id: 'b' }]

      const wrapper = mountBasket({
        props: baseProps,
        global: placementGlobal,
      })

      expect(readPlacements(wrapper)).toEqual([
        ['basket_banner', '1', '3'],
        ['basket_banner', '2', '3'],
        ['basket_banner', '3', '3'],
      ])
    })

    it('does not count a campaign without a basket reduction in the deal set', () => {
      mocks.reactivePage!.props.campaign = { id: 'c-1' }
      mocks.basketRef!.value = {
        ...mocks.basketRef!.value!,
        cost: { hasCampaignReduction: false },
      }

      mocks.bannersRef!.value = [{ id: 'a' }]

      const wrapper = mountBasket({
        props: baseProps,
        global: placementGlobal,
      })

      expect(readPlacements(wrapper)).toEqual([['basket_banner', '1', '1']])
    })

    it('renders no banner section while the banners are still unresolved', () => {
      mocks.bannersRef!.value = undefined

      const wrapper = mountBasket({
        props: baseProps,
        global: placementGlobal,
      })

      expect(wrapper.findAll('[data-testid="deal-banner"]')).toHaveLength(0)
    })
  })
})
