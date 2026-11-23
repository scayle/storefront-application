import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import { ANNOUNCE_DEBOUNCE_MS } from '@client/composables/useAnnouncer'
import type { ReactivePageMock } from '@test/utils/inertia'
import { createMockListingProduct } from '@test/mock-data/products'
import { FocusableProductCardStub, SFButtonStub } from '@test/stubs/common'
import Wishlist from './Wishlist.vue'

const stubMeta: SEOMeta = {
  title: 'Wishlist',
  robots: 'noindex, nofollow',
}

const mountedWrappers: VueWrapper[] = []
const mountWishlist: typeof mount = ((...args: Parameters<typeof mount>) => {
  const wrapper = mount(...args)
  mountedWrappers.push(wrapper)
  return wrapper
}) as typeof mount

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  announce: vi.fn(),
  trackSelectItem: vi.fn(),
  trackViewItemList: vi.fn(),
  trackViewProductTile: vi.fn(),
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage, createDeferredStub } =
    await import('@test/utils/inertia')

  mocks.reactivePage = createReactivePage()

  return {
    Deferred: createDeferredStub(),
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

const tMock = (key: string) => key

vi.mock('@client/composables/useAnnouncer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/composables/useAnnouncer')>()
  return {
    ...actual,
    useAnnouncer: () => ({ announce: mocks.announce }),
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: { name?: string }) =>
      params?.name ? `${key} ${params.name}` : key,
  }),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => ({
    trackSelectItem: mocks.trackSelectItem,
    trackViewItemList: mocks.trackViewItemList,
    trackViewProductTile: mocks.trackViewProductTile,
  }),
}))

const TrackingProductCardStub = defineComponent({
  name: 'SFProductCard',
  props: {
    product: { type: Object, required: true },
    productIndex: { type: Number, required: false, default: 0 },
  },
  emits: ['intersectProduct', 'selectProduct'],
  setup(props, { emit }) {
    return () =>
      h('div', [
        h(
          'button',
          {
            type: 'button',
            'data-testid': `intersect-${props.productIndex}`,
            onClick: () => emit('intersectProduct'),
          },
          'intersect',
        ),
        h(
          'button',
          {
            type: 'button',
            'data-testid': `select-${props.productIndex}`,
            onClick: () => emit('selectProduct'),
          },
          'select',
        ),
      ])
  },
})

describe('Wishlist page', () => {
  beforeEach(() => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props = {
        storefront: {
          config: { countrySelector: 'path' },
          country: { path: 'en', isDefault: false },
        },
      }
    }
    mocks.trackSelectItem.mockClear()
    mocks.trackViewItemList.mockClear()
  })

  afterEach(() => {
    while (mountedWrappers.length) {
      mountedWrappers.pop()?.unmount()
    }
  })

  const globalConfig = {
    stubs: {
      SFProductCard: true,
      SFButton: SFButtonStub,
      PageMetaHead: true,
    },
    mocks: {
      $t: tMock,
    },
  }

  it('shows the sign-in and continue-shopping CTAs when the wishlist is empty and the customer is logged out', () => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props.customer = null
    }

    const wrapper = mountWishlist(Wishlist, {
      props: {
        meta: stubMeta,
        wishlist: { items: [] },
      },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="wishlist-empty-state"]').exists()).toBe(
      true,
    )
    expect(wrapper.get('[data-testid="wishlist-signin"]').text()).toBe(
      'common.sign_in',
    )
    expect(
      wrapper.get('[data-testid="wishlist-continue-shopping"]').text(),
    ).toBe('common.continue_shopping')
  })

  it('orders the empty-state CTAs with sign-in first', () => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props.customer = null
    }

    const wrapper = mountWishlist(Wishlist, {
      props: {
        meta: stubMeta,
        wishlist: { items: [] },
      },
      global: globalConfig,
    })

    const actions = wrapper
      .get('[role="group"]')
      .findAll('a')
      .map((node) => node.text())
    expect(actions).toEqual(['common.sign_in', 'common.continue_shopping'])
  })

  it('labels the empty-state action group for assistive technology', () => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props.customer = null
    }

    const wrapper = mountWishlist(Wishlist, {
      props: {
        meta: stubMeta,
        wishlist: { items: [] },
      },
      global: globalConfig,
    })

    const actionGroup = wrapper.get('[role="group"]')
    expect(actionGroup.attributes('aria-label')).toBe(
      'wishlist_page.a11y.empty_actions',
    )
  })

  it('shows continue shopping CTA only when wishlist is empty and user is logged in', () => {
    if (mocks.reactivePage) {
      mocks.reactivePage.props.customer = { id: 'user-id' }
    }

    const wrapper = mountWishlist(Wishlist, {
      props: {
        meta: stubMeta,
        wishlist: { items: [] },
      },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="wishlist-empty-state"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="wishlist-signin"]').exists()).toBe(false)
    expect(
      wrapper.find('[data-testid="wishlist-continue-shopping"]').exists(),
    ).toBe(true)
  })

  it('does not render the empty-state actions when wishlist has items', () => {
    const wrapper = mountWishlist(Wishlist, {
      props: {
        meta: stubMeta,
        wishlist: {
          items: [{ key: 'item-key', product: {} }],
        },
      } as never,
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="wishlist-empty-state"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="wishlist-signin"]').exists()).toBe(false)
    expect(
      wrapper.find('[data-testid="wishlist-continue-shopping"]').exists(),
    ).toBe(false)
    expect(wrapper.find('[data-testid="wishlist-grid"]').exists()).toBe(true)
  })

  describe('list tracking', () => {
    const trackingGlobal = {
      stubs: {
        SFProductCard: TrackingProductCardStub,
        SFButton: SFButtonStub,
        PageMetaHead: true,
      },
      mocks: { $t: tMock },
    }

    it('tracks view_item_list once with the wishlist products', async () => {
      const products = [
        createMockListingProduct({ id: 1 }),
        createMockListingProduct({ id: 2 }),
      ]
      const items = products.map((product) => ({
        key: `k${product.id}`,
        productId: product.id,
        product,
        customData: {},
      }))

      mountWishlist(Wishlist, {
        props: {
          meta: stubMeta,
          wishlist: { items },
        },
        global: trackingGlobal,
      })
      await flushPromises()

      expect(mocks.trackViewItemList).toHaveBeenCalledOnce()
      expect(mocks.trackViewItemList).toHaveBeenCalledWith(products, {
        product_list_type: 'wishlist',
        product_list_id: undefined,
        total: 2,
      })
    })

    it('tracks select_item with the wishlist surface and one-based index', async () => {
      const product = createMockListingProduct({ id: 42 })
      const items = [{ key: 'k1', productId: 42, product, customData: {} }]

      const wrapper = mountWishlist(Wishlist, {
        props: {
          meta: stubMeta,
          wishlist: { items },
        },
        global: trackingGlobal,
      })
      await flushPromises()

      await wrapper.get('[data-testid="select-0"]').trigger('click')

      expect(mocks.trackSelectItem).toHaveBeenCalledWith(product, {
        index: 1,
        position: 1,
        product_list_type: 'wishlist',
        product_list_id: undefined,
        total: 1,
      })
    })
  })

  describe('focus restoration after removal', () => {
    // FocusableProductCardStub renders a real, focusable <a> per card and
    // exposes `focus()` exactly like SFProductCard (querySelector('a')), so
    // assertions run against `document.activeElement` rather than a spy.
    const focusGlobal = {
      stubs: {
        SFProductCard: FocusableProductCardStub,
        SFButton: SFButtonStub,
        PageMetaHead: true,
      },
      mocks: { $t: tMock },
    }

    it('moves focus to the adjacent card after an item is removed', async () => {
      const items = [
        { key: 'k1', product: { id: 1 } },
        { key: 'k2', product: { id: 2 } },
      ]

      const wrapper = mountWishlist(Wishlist, {
        props: { meta: stubMeta, wishlist: { items } } as never,
        global: focusGlobal,
        attachTo: document.body,
      })
      await flushPromises()

      // Mirror Inertia's partial reload, which replaces the `wishlist` prop
      // with the server response. The diff picks `k2` as the adjacent survivor.
      await wrapper.setProps({
        wishlist: {
          items: [{ key: 'k2', product: { id: 2 } }],
        },
      } as never)
      await flushPromises()
      await nextTick()

      expect(document.activeElement).toBe(
        wrapper.get('[data-testid="card-link-2"]').element,
      )
    })

    it('moves focus to the previous card when the last item is removed', async () => {
      const items = [
        { key: 'k1', product: { id: 1 } },
        { key: 'k2', product: { id: 2 } },
      ]

      const wrapper = mountWishlist(Wishlist, {
        props: { meta: stubMeta, wishlist: { items } } as never,
        global: focusGlobal,
        attachTo: document.body,
      })
      await flushPromises()

      // Removing the last item leaves no next sibling, so focus falls back to
      // the card before the removed one.
      await wrapper.setProps({
        wishlist: {
          items: [{ key: 'k1', product: { id: 1 } }],
        },
      } as never)
      await flushPromises()
      await nextTick()

      expect(document.activeElement).toBe(
        wrapper.get('[data-testid="card-link-1"]').element,
      )
    })

    it('moves focus to the empty-state CTA when the last remaining item is removed', async () => {
      if (mocks.reactivePage) {
        mocks.reactivePage.props.customer = null
      }
      const items = [{ key: 'k1', product: { id: 1 } }]

      const wrapper = mountWishlist(Wishlist, {
        props: { meta: stubMeta, wishlist: { items } } as never,
        global: focusGlobal,
        attachTo: document.body,
      })
      await flushPromises()

      await wrapper.setProps({
        wishlist: { items: [] },
      } as never)
      await flushPromises()
      await nextTick()

      // The signed-out empty state leads with the sign-in CTA.
      expect(document.activeElement).toBe(
        wrapper.get('[data-testid="wishlist-signin"]').element,
      )
    })

    it('announces the removal with the removed product name', async () => {
      const items = [
        {
          key: 'k1',
          product: createMockListingProduct({ id: 1, name: 'Urban Jacket' }),
        },
        { key: 'k2', product: createMockListingProduct({ id: 2 }) },
      ]

      const wrapper = mountWishlist(Wishlist, {
        props: { meta: stubMeta, wishlist: { items } } as never,
        global: focusGlobal,
      })
      await flushPromises()

      await wrapper.setProps({
        wishlist: {
          items: [{ key: 'k2', product: items[1]!.product }],
        },
      } as never)
      await flushPromises()

      expect(mocks.announce).toHaveBeenCalledWith(
        'wishlist_toggle.a11y.removed_announcement Urban Jacket',
        { debounce: ANNOUNCE_DEBOUNCE_MS },
      )
    })
  })
})
