import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { mount } from '@vue/test-utils'
import type { ListingProduct } from '@scayle/storefront/types'
import { createMockListingProduct } from '../../../test/mock-data/products'
import { useProductListTracking } from './useProductListTracking'
import type {
  UseProductListTrackingOptions,
  UseProductListTrackingReturn,
} from './useProductListTracking'

const mocks = vi.hoisted(() => ({
  trackSelectItem: vi.fn(),
  trackViewItemList: vi.fn(),
  trackViewProductTile: vi.fn(),
}))

const query = ref(new URLSearchParams())

vi.mock('./useProductEvents', () => ({
  useProductEvents: () => ({
    trackSelectItem: mocks.trackSelectItem,
    trackViewItemList: mocks.trackViewItemList,
    trackViewProductTile: mocks.trackViewProductTile,
  }),
}))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({ query: computed(() => query.value) }),
}))

const createProduct = (id: number): ListingProduct =>
  createMockListingProduct({ id })

/** Mounts the composable inside a component so its `onMounted` watcher runs. */
const mountTracking = (
  products: MaybeRefOrGetter<ListingProduct[]>,
  options: UseProductListTrackingOptions,
) => {
  let tracking!: UseProductListTrackingReturn
  const wrapper = mount(
    defineComponent({
      setup() {
        tracking = useProductListTracking(products, options)
        return () => h('div')
      },
    }),
  )

  return { wrapper, ...tracking }
}

describe('useProductListTracking', () => {
  beforeEach(() => {
    query.value = new URLSearchParams()
  })

  it('tracks the list once per list id, not again when a filter empties and refills the grid', async () => {
    const products = ref<ListingProduct[]>([createProduct(1)])
    mountTracking(products, {
      productListType: 'category',
      productListId: '50342',
    })

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)

    products.value = []
    await nextTick()
    products.value = [createProduct(2)]
    await nextTick()

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)
  })

  it('tracks only the tile of the card that intersects, not the cards of its row', () => {
    const products = [createProduct(1), createProduct(2), createProduct(3)]

    const { onProductIntersects } = mountTracking(products, {
      itemsPerPage: 24,
      productListType: 'category',
      productListId: '50342',
      total: 96,
    })

    onProductIntersects(1)

    expect(mocks.trackViewProductTile).toHaveBeenCalledTimes(1)
    expect(mocks.trackViewProductTile).toHaveBeenCalledWith(products[1], {
      product_list_type: 'category',
      product_list_id: '50342',
      position: 2,
      total: 96,
    })
  })

  it('counts tile and select positions across pages while GA4 stays page-relative', () => {
    query.value = new URLSearchParams({ page: '2' })
    const products = [createProduct(25), createProduct(26)]

    const { onProductIntersects, onProductSelect } = mountTracking(products, {
      itemsPerPage: 24,
      productListType: 'category',
      productListId: '50342',
      total: 96,
    })

    onProductIntersects(1)
    onProductSelect(products[1]!, 1)

    expect(mocks.trackViewProductTile).toHaveBeenCalledWith(
      products[1],
      expect.objectContaining({ position: 26, total: 96 }),
    )
    expect(mocks.trackSelectItem).toHaveBeenCalledWith(
      products[1],
      expect.objectContaining({ index: 2, position: 26, total: 96 }),
    )
  })

  it.for([
    {
      name: 'a non-numeric page',
      search: 'page=abc',
      itemsPerPage: 24,
      position: 1,
    },
    {
      name: 'page 2 without itemsPerPage',
      search: 'page=2',
      itemsPerPage: undefined,
      position: 3,
    },
  ])(
    'reports the list-wide position for $name',
    ({ search, itemsPerPage, position }) => {
      query.value = new URLSearchParams(search)
      const { onProductIntersects } = mountTracking(
        [createProduct(1), createProduct(2)],
        { itemsPerPage, productListType: 'category' },
      )

      onProductIntersects(0)

      expect(mocks.trackViewProductTile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ position }),
      )
    },
  )

  it('tracks select_item with a one-based index and the surface', () => {
    const product = createProduct(42)

    const { onProductSelect } = mountTracking([product], {
      productListType: 'wishlist',
    })

    onProductSelect(product, 0)

    expect(mocks.trackSelectItem).toHaveBeenCalledWith(product, {
      index: 1,
      position: 1,
      product_list_type: 'wishlist',
      product_list_id: undefined,
      total: 1,
    })
  })

  it('tracks the list once on mount with its products and total', () => {
    const products = [createProduct(1)]
    mountTracking(products, {
      productListType: 'category',
      productListId: '50342',
      total: 96,
    })

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)
    expect(mocks.trackViewItemList).toHaveBeenCalledWith(products, {
      product_list_type: 'category',
      product_list_id: '50342',
      total: 96,
    })
  })

  it('falls back to the rendered product count when no total is given', () => {
    mountTracking([createProduct(1), createProduct(2)], {
      productListType: 'wishlist',
    })

    expect(mocks.trackViewItemList).toHaveBeenCalledWith(expect.any(Array), {
      product_list_type: 'wishlist',
      product_list_id: undefined,
      total: 2,
    })
  })

  it('waits for deferred products and skips an empty list', async () => {
    const products = ref<ListingProduct[]>([])
    mountTracking(products, {
      productListType: 'wishlist',
    })

    expect(mocks.trackViewItemList).not.toHaveBeenCalled()

    products.value = [createProduct(1)]
    await nextTick()

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)
    expect(mocks.trackViewItemList).toHaveBeenCalledWith(
      products.value,
      expect.objectContaining({ total: 1 }),
    )
  })

  it('fires again when the list id changes, not when the products do', async () => {
    const products = ref([createProduct(1)])
    const productListId = ref('50342')
    mountTracking(products, {
      productListType: 'category',
      productListId,
      total: 96,
    })

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)

    // Pagination or filter reload: same category, other products.
    products.value = [createProduct(2)]
    await nextTick()
    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)

    // Category switch through a `preserveState` visit.
    productListId.value = '50343'
    await nextTick()
    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(2)
    expect(mocks.trackViewItemList).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ product_list_id: '50343' }),
    )

    // Back to the first category: a new list view, the guard only remembers
    // the last id.
    productListId.value = '50342'
    await nextTick()
    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(3)
  })

  it('stops watching the list id once the component unmounts', async () => {
    const productListId = ref('50342')
    const { wrapper } = mountTracking([createProduct(1)], {
      productListType: 'category',
      productListId,
    })

    wrapper.unmount()
    productListId.value = '50343'
    await nextTick()

    expect(mocks.trackViewItemList).toHaveBeenCalledTimes(1)
  })
})
