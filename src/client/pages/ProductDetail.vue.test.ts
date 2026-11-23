import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { DetailedProduct, ProductVariant } from '@scayle/storefront/types'
import type { SEOMeta } from '@shared/types/SEO'
import {
  createMockDetailedProduct,
  createMockListingProduct,
} from '../../test/mock-data/products'
import { useAddToBasketSlideIn } from '../composables/useAddToBasketSlideIn'
import ProductDetail from './ProductDetail.vue'

const mocks = vi.hoisted(() => ({
  deferredState: { useFallback: false },
  trackViewItem: vi.fn(),
  addProductId: vi.fn(),
  addItem: vi.fn(),
  trackAddToBasket: vi.fn(),
  subscriptionEnabled: true,
  // Query ref backing the `useRoute` mock; tests mutate `.value` to drive the
  // `variantId` lookup and the active-variant watcher.
  queryRef: null as Ref<URLSearchParams> | null,
  // One entry per `useStickyColumn` call, in call order, recording the element
  // ref the page handed in and the offset the mock handed back.
  stickyColumns: [] as {
    element: Ref<HTMLElement | undefined>
    top: string
  }[],
}))

// `createMockDetailedProduct` ships a single variant, which always resolves via
// the `variants.length === 1` auto-select branch. These helpers give a
// multi-variant product so the `variantId` query-param lookup and the
// quantity-reset watcher can be exercised.
function createMockVariant(id: number, label: string): ProductVariant {
  return {
    id,
    label,
    stock: 10,
    isLowStock: false,
    isSoldOut: false,
    price: {
      finalPrice: '$9.99',
      originalPrice: '$12.99',
      currency: 'EUR',
      finalPriceInCents: 999,
      originalPriceInCents: 1299,
      isOnSale: false,
      showOriginally: false,
      showLowestPriorPriceLine: false,
      strikeOriginally: false,
      strikeLowestPriorPrice: false,
      hasCampaignReduction: false,
      strikeThroughPrices: [],
    },
  }
}

function createMultiVariantProduct(): DetailedProduct {
  return createMockDetailedProduct({
    variants: [createMockVariant(1, 'M'), createMockVariant(2, 'L')],
  })
}

vi.mock('@inertiajs/vue3', async () => {
  const vue = await import('vue')
  return {
    Deferred: vue.defineComponent({
      name: 'Deferred',
      props: { data: { type: [String, Array], required: false } },
      setup(_, { slots }) {
        return () =>
          vue.h(
            'div',
            mocks.deferredState.useFallback
              ? slots.fallback?.()
              : slots.default?.(),
          )
      },
    }),
    router: { replace: vi.fn() },
    usePage: () => ({
      props: {
        campaign: null,
        storefront: {
          config: { countrySelector: 'path' },
          country: {
            path: 'en',
            isDefault: false,
            publicFields: { subscriptionEnabled: mocks.subscriptionEnabled },
          },
        },
      },
    }),
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useRoute', async () => {
  const { ref } = await import('vue')
  mocks.queryRef = ref(new URLSearchParams())
  return {
    useRoute: () => ({
      query: mocks.queryRef,
      path: ref('/p/jacket-premium'),
    }),
  }
})

vi.mock('@client/composables/useProductPromotions', async () => {
  const { ref } = await import('vue')
  return {
    useProductPromotions: () => ({
      promotions: ref([]),
      hasAppliedPromotion: ref(false),
    }),
  }
})

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({
    isGiftPromotionApplicable: vi.fn(() => false),
    addItem: mocks.addItem,
  }),
}))

vi.mock('@client/composables/useRecentlyViewedProducts', () => ({
  useRecentlyViewedProducts: () => ({ addProductId: mocks.addProductId }),
}))

vi.mock('@client/composables/tracking/useBasketEvents', () => ({
  useBasketEvents: () => ({ trackAddToBasket: mocks.trackAddToBasket }),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => ({ trackViewItem: mocks.trackViewItem }),
}))

// The real composable measures the element and reads the viewport, neither of
// which happy-dom lays out. Handing each call its own offset instead lets the
// tests trace a rendered `top` back to the call that produced it, so a style
// bound to the wrong column is visible rather than coincidentally equal.
vi.mock('@client/composables/useStickyColumn', async () => {
  const { computed } = await import('vue')
  return {
    useStickyColumn: (element: Ref<HTMLElement | undefined>) => {
      const top = `${(mocks.stickyColumns.length + 1) * 10}px`
      mocks.stickyColumns.push({ element, top })
      return computed(() => ({ top }))
    },
  }
})

const SFProductSliderSkeletonStub = defineComponent({
  name: 'SFProductSliderSkeleton',
  setup() {
    return () => h('div', { 'data-testid': 'product-slider-skeleton' })
  },
})

const globalConfig = {
  stubs: {
    SFProductGallery: true,
    SFBreadcrumb: true,
    SFProductPrice: true,
    SFProductDealBanners: true,
    SFPromotionConfirmation: true,
    SFSiblingSelection: true,
    SFProductActions: true,
    SFProductSubscription: {
      template: '<div data-testid="product-subscription" />',
    },
    SFGiftPromotionProducts: true,
    SFProductDetails: true,
    SFProductSlider: true,
    SFProductSliderSkeleton: SFProductSliderSkeletonStub,
    SFRecentlyViewedProductSlider: true,
    PageMetaHead: true,
    // Renders its default slot so the subscription block inside it is reachable.
    ClientOnly: { template: '<div><slot /></div>' },
  },
  mocks: {
    $t: (key: string) => key,
  },
}

const baseProps = {
  product: createMockDetailedProduct(),
  meta: {
    title: "Jacket 'Premium'",
    description: 'A premium jacket.',
    robots: 'index, follow',
  } as SEOMeta,
}

describe('ProductDetail page', () => {
  beforeEach(() => {
    mocks.deferredState.useFallback = false
    mocks.trackViewItem.mockClear()
    mocks.addProductId.mockClear()
    mocks.stickyColumns.length = 0
    mocks.addItem.mockReset()
    mocks.trackAddToBasket.mockClear()
    mocks.subscriptionEnabled = true
    if (mocks.queryRef) {
      mocks.queryRef.value = new URLSearchParams()
    }
    useAddToBasketSlideIn().close()
  })

  it('renders the product heading and recommendation sliders when data is resolved', () => {
    const wrapper = mount(ProductDetail, {
      props: {
        ...baseProps,
        similarProducts: [createMockListingProduct()],
        trendingProducts: [createMockListingProduct({ id: 2 })],
      },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="pdp-product-brand"]').text()).toBe(
      'ADIDAS ORIGINALS',
    )
    expect(wrapper.get('[data-testid="pdp-product-name"]').text()).toBe(
      "Jacket 'Premium'",
    )
    expect(
      wrapper.find('[data-testid="similar-products-slider"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="trending-products-slider"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="product-slider-skeleton"]').exists(),
    ).toBe(false)
  })

  it('renders the slider skeleton while recommendation props are deferred', () => {
    mocks.deferredState.useFallback = true

    const wrapper = mount(ProductDetail, {
      props: baseProps,
      global: globalConfig,
    })

    expect(
      wrapper.find('[data-testid="product-slider-skeleton"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-testid="similar-products-slider"]').exists(),
    ).toBe(false)
  })

  it('tracks the product view and records it as recently viewed on mount', () => {
    const product = createMockDetailedProduct()
    mount(ProductDetail, {
      props: { ...baseProps, product },
      global: globalConfig,
    })

    expect(mocks.trackViewItem).toHaveBeenCalledTimes(1)
    expect(mocks.addProductId).toHaveBeenCalledWith(product.id)
  })

  it('selects the variant matching the variantId query param for a multi-variant product', () => {
    mocks.queryRef!.value = new URLSearchParams({ variantId: '2' })

    mount(ProductDetail, {
      props: { ...baseProps, product: createMultiVariantProduct() },
      global: globalConfig,
    })

    // `trackViewItem(product, activeVariant)` on mount surfaces the resolved
    // active variant without having to reach into a stubbed child.
    expect(mocks.trackViewItem.mock.calls[0]?.[1]).toMatchObject({ id: 2 })
  })

  it('selects no variant when a multi-variant product has no variantId query param', () => {
    mount(ProductDetail, {
      props: { ...baseProps, product: createMultiVariantProduct() },
      global: globalConfig,
    })

    expect(mocks.trackViewItem.mock.calls[0]?.[1]).toBeUndefined()
  })

  const subscriptionCases = [
    {
      name: 'hides the subscription block when no variant is subscription-eligible',
      variantHasSubscription: false,
      shopSubscriptionEnabled: true,
      isVisible: false,
    },
    {
      name: 'renders the subscription block when a variant carries a subscription',
      variantHasSubscription: true,
      shopSubscriptionEnabled: true,
      isVisible: true,
    },
    {
      name: 'hides the subscription block when subscriptions are disabled for the shop, even for a variant that carries a subscription',
      variantHasSubscription: true,
      shopSubscriptionEnabled: false,
      isVisible: false,
    },
  ]

  it.for(subscriptionCases)(
    '$name',
    ({ variantHasSubscription, shopSubscriptionEnabled, isVisible }) => {
      mocks.subscriptionEnabled = shopSubscriptionEnabled
      const variant = createMockVariant(1, 'M')
      const product = createMockDetailedProduct({
        variants: variantHasSubscription
          ? [
              {
                ...variant,
                subscription: {
                  intervals: [{ label: 'Monthly', value: 'monthly' }],
                },
              },
            ]
          : [variant],
      })

      const wrapper = mount(ProductDetail, {
        props: { ...baseProps, product },
        global: globalConfig,
      })

      expect(
        wrapper.find('[data-testid="product-subscription"]').exists(),
      ).toBe(isVisible)
    },
  )

  describe('subscription add', () => {
    const subscriptionVariant = {
      ...createMockVariant(1, 'M'),
      subscription: { intervals: [{ label: 'Monthly', value: 'monthly' }] },
    }
    const subscriptionItem = {
      productName: 'Jacket',
      variantId: 1,
      quantity: 2,
      customData: { subscriptionDefinition: {} },
    }
    // Emits the add the way `SFProductSubscription` does once the customer
    // confirms an interval.
    const SFProductSubscriptionStub = defineComponent({
      name: 'SFProductSubscription',
      emits: ['add-item-to-basket'],
      setup(_, { emit }) {
        return () =>
          h('button', {
            'data-testid': 'subscription-add',
            onClick: () => emit('add-item-to-basket', subscriptionItem),
          })
      },
    })

    const mountWithSubscription = () => {
      mocks.queryRef!.value = new URLSearchParams({ variantId: '1' })
      return mount(ProductDetail, {
        props: {
          ...baseProps,
          product: createMockDetailedProduct({
            variants: [subscriptionVariant, createMockVariant(2, 'L')],
          }),
        },
        global: {
          ...globalConfig,
          stubs: {
            ...globalConfig.stubs,
            SFProductSubscription: SFProductSubscriptionStub,
          },
        },
      })
    }

    it('tracks add_to_basket with the units the basket gained, not the requested quantity', async () => {
      // Requested two, the Storefront API capped the add at one.
      mocks.addItem.mockResolvedValue(1)
      const wrapper = mountWithSubscription()

      await wrapper.get('[data-testid="subscription-add"]').trigger('click')
      await flushPromises()

      expect(mocks.addItem).toHaveBeenCalledWith(subscriptionItem)
      expect(mocks.trackAddToBasket).toHaveBeenCalledTimes(1)
      expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: baseProps.product.id }),
        1,
      )
    })

    it('tracks nothing when the capped add gained no units', async () => {
      mocks.addItem.mockResolvedValue(0)
      const wrapper = mountWithSubscription()

      await wrapper.get('[data-testid="subscription-add"]').trigger('click')
      await flushPromises()

      expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
    })
  })

  it('resets the quantity to 1 when the active variant changes', async () => {
    mocks.queryRef!.value = new URLSearchParams({ variantId: '1' })

    const SFProductActionsStub = defineComponent({
      name: 'SFProductActions',
      props: { quantity: { type: Number, default: 1 } },
      emits: ['update:quantity'],
      setup(props, { emit }) {
        return () =>
          h(
            'button',
            {
              'data-testid': 'quantity',
              'data-quantity': String(props.quantity),
              onClick: () => emit('update:quantity', 3),
            },
            String(props.quantity),
          )
      },
    })

    const wrapper = mount(ProductDetail, {
      props: { ...baseProps, product: createMultiVariantProduct() },
      global: {
        ...globalConfig,
        stubs: {
          ...globalConfig.stubs,
          SFProductActions: SFProductActionsStub,
        },
      },
    })

    const quantity = () =>
      wrapper.get('[data-testid="quantity"]').attributes('data-quantity')

    await wrapper.get('[data-testid="quantity"]').trigger('click')
    expect(quantity()).toBe('3')

    // Switching the active variant via the query param must reset quantity.
    mocks.queryRef!.value = new URLSearchParams({ variantId: '2' })
    await nextTick()
    await flushPromises()

    expect(quantity()).toBe('1')
  })

  it('binds each measured column offset back to the element it was measured from', () => {
    mount(ProductDetail, {
      props: baseProps,
      global: globalConfig,
    })

    expect(mocks.stickyColumns).toHaveLength(2)

    // Each offset has to land on the element it was measured from — a `top`
    // anywhere else does nothing. The two measurements are the page's two
    // columns, not the same element measured twice.
    for (const { element, top } of mocks.stickyColumns) {
      expect(element.value?.style.top).toBe(top)
    }
    expect(mocks.stickyColumns[0]!.element.value).not.toBe(
      mocks.stickyColumns[1]!.element.value,
    )
  })
})
