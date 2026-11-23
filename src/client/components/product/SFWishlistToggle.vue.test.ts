import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import { createMockListingProduct } from '@test/mock-data/products'
import SFWishlistToggle from './SFWishlistToggle.vue'

const wishlistItems = [{ id: 1, productId: 42 }]

const mocks = vi.hoisted(() => ({
  hasProductInWishlist: vi.fn(),
  isProductToggling: vi.fn(() => false),
  toggleItem: vi.fn(),
  trackAddToWishlist: vi.fn(),
}))

vi.mock('@client/composables/useWishlist', () => ({
  useWishlist: () => ({
    hasProductInWishlist: mocks.hasProductInWishlist,
    isProductToggling: mocks.isProductToggling,
    toggleItem: mocks.toggleItem,
    count: computed(() => wishlistItems.length),
    wishlist: computed(() => ({ items: wishlistItems })),
    reloadWishlist: vi.fn(),
  }),
}))

vi.mock('@client/composables/tracking/useWishlistEvents', () => ({
  useWishlistEvents: () => ({
    trackAddToWishlist: mocks.trackAddToWishlist,
  }),
}))

describe('SFWishlistToggle', () => {
  const tMock = (key: string) => key
  const product = createMockListingProduct({ id: 42 })

  beforeEach(() => {
    mocks.hasProductInWishlist.mockReset()
    mocks.isProductToggling.mockReset()
    mocks.isProductToggling.mockReturnValue(false)
    mocks.toggleItem.mockReset()
    mocks.trackAddToWishlist.mockReset()
  })

  const createWrapper = (
    props: Record<string, unknown> = { product, productListType: 'category' },
  ) =>
    mount(SFWishlistToggle, {
      props: props as never,
      global: {
        stubs: {
          SFButton: {
            // The toggle now guards double-activation in `onToggleWishlist`
            // (no native `disabled`), so the stub always emits and exposes
            // `aria-disabled` for assertions.
            template:
              '<button :data-testid="$attrs[\'data-testid\']" :aria-disabled="$attrs[\'aria-disabled\']" @click="$emit(\'click\')"><slot name="icon" :_class="{}" /></button>',
          },
          IconWishlist: true,
          IconWishlisted: true,
        },
        mocks: {
          $t: tMock,
        },
      },
    })

  it('renders "add" state when product is not in wishlist', () => {
    mocks.hasProductInWishlist.mockReturnValue(false)

    const wrapper = createWrapper()
    expect(wrapper.get('button').attributes('data-testid')).toBe(
      'add-item-to-wishlist-button',
    )
  })

  it('renders "remove" state when product is in wishlist', () => {
    mocks.hasProductInWishlist.mockReturnValue(true)

    const wrapper = createWrapper()
    expect(wrapper.get('button').attributes('data-testid')).toBe(
      'remove-item-from-wishlist-button',
    )
  })

  it('calls toggleItem with product id on click', async () => {
    mocks.hasProductInWishlist.mockReturnValue(false)
    mocks.toggleItem.mockResolvedValue({ added: true })

    const wrapper = createWrapper()
    await wrapper.get('button').trigger('click')

    expect(mocks.toggleItem).toHaveBeenCalledWith(42)
  })

  it.for([
    {
      name: 'the list surface and no id or index',
      props: { productListType: 'category' },
      surface: { product_list_type: 'category', product_list_id: undefined },
      index: undefined,
    },
    {
      name: 'the position passed as index',
      props: { productListType: 'category', index: 5 },
      surface: { product_list_type: 'category', product_list_id: undefined },
      index: 5,
    },
    {
      name: 'the surface id next to the surface',
      props: { productListType: 'gift_selection', productListId: 'promo-1' },
      surface: {
        product_list_type: 'gift_selection',
        product_list_id: 'promo-1',
      },
      index: undefined,
    },
    {
      name: 'a null surface for the PDP main item',
      props: { productListType: null },
      surface: { product_list_type: null, product_list_id: undefined },
      index: undefined,
    },
    {
      // `null` survives JSON serialization, `undefined` drops the key.
      name: 'a null surface id next to the null surface when the PDP passes it',
      props: { productListType: null, productListId: null },
      surface: { product_list_type: null, product_list_id: null },
      index: undefined,
    },
  ])('tracks an addition with $name', async ({ props, surface, index }) => {
    mocks.hasProductInWishlist.mockReturnValue(false)
    mocks.toggleItem.mockResolvedValue({ added: true })

    const wrapper = createWrapper({ product, ...props })
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(mocks.trackAddToWishlist).toHaveBeenCalledExactlyOnceWith(
      product,
      surface,
      index,
    )
  })

  it('does not track when item is removed', async () => {
    mocks.hasProductInWishlist.mockReturnValue(true)
    mocks.toggleItem.mockResolvedValue({ added: false })

    const wrapper = createWrapper()
    await wrapper.get('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(mocks.trackAddToWishlist).not.toHaveBeenCalled()
  })

  it('becomes usable again after toggleItem returns an error', async () => {
    mocks.hasProductInWishlist.mockReturnValue(false)
    mocks.toggleItem.mockResolvedValue({ added: false, error: new Error('x') })

    const wrapper = createWrapper()
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('button').attributes('aria-disabled')).toBeUndefined()

    await wrapper.get('button').trigger('click')

    expect(mocks.toggleItem).toHaveBeenCalledTimes(2)
  })

  it('prevents double toggles while request is in-flight', async () => {
    mocks.hasProductInWishlist.mockReturnValue(false)

    const deferred = Promise.withResolvers<{ added: boolean }>()
    mocks.toggleItem.mockImplementation(() => deferred.promise)

    const wrapper = createWrapper()
    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('click')

    expect(mocks.toggleItem).toHaveBeenCalledTimes(1)

    deferred.resolve({ added: true })
    await vi.waitFor(() =>
      expect(wrapper.get('button').attributes('aria-disabled')).toBeUndefined(),
    )
  })

  it('stays disabled when a sibling toggle instance is already toggling the same product', async () => {
    mocks.hasProductInWishlist.mockReturnValue(false)
    mocks.isProductToggling.mockReturnValue(true)
    mocks.toggleItem.mockResolvedValue({ added: true })

    const wrapper = createWrapper()

    expect(wrapper.get('button').attributes('aria-disabled')).toBe('true')

    await wrapper.get('button').trigger('click')

    expect(mocks.toggleItem).not.toHaveBeenCalled()
    expect(mocks.trackAddToWishlist).not.toHaveBeenCalled()
  })
})
