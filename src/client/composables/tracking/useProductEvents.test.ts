import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  Campaign,
  ListingProduct,
  ProductVariant,
} from '@scayle/storefront/types'
import { createMockDetailedProduct } from '../../../test/mock-data/products'
import { useProductEvents } from './useProductEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  track: vi.fn(),
  page: { props: { campaign: null as Campaign | null } },
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => mocks.page,
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('./useAnalytics', () => ({
  useAnalytics: () => ({ track: mocks.track }),
}))

const createProduct = (
  overrides: Partial<ListingProduct> = {},
): ListingProduct => ({
  id: 42,
  name: 'Sneaker',
  brand: 'Acme',
  brandId: 7,
  link: '/p/sneaker-42',
  price: {
    finalPrice: '29,99 €',
    finalPriceInCents: 2999,
    originalPrice: '39,99 €',
    originalPriceInCents: 3999,
    totalReduction: '10,00 €',
    totalReductionInCents: 1000,
    currency: 'EUR',
    strikeThroughPrices: [],
    isOnSale: true,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: true,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
    hasDifferentPrices: false,
  },
  isSoldOut: false,
  isLowStock: false,
  isNew: false,
  sellableTimeframe: { state: 'active' as const },
  images: [],
  siblings: [],
  color: '',
  attributeValuesByGroup: {},
  ...overrides,
})

const createVariant = (): ProductVariant => ({
  id: 4242,
  label: 'M',
  stock: 3,
  isLowStock: false,
  isSoldOut: false,
  price: {
    finalPrice: '24,99 €',
    finalPriceInCents: 2499,
    originalPrice: '24,99 €',
    originalPriceInCents: 2499,
    currency: 'EUR',
    strikeThroughPrices: [],
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    hasCampaignReduction: false,
  },
})

describe('useProductEvents', () => {
  beforeEach(() => {
    mocks.page.props.campaign = null
  })

  it('reports the active campaign on view_product_detail for a campaign-priced variant', () => {
    mocks.page.props.campaign = { id: '31' } as Campaign
    const { trackViewItem } = useProductEvents()
    const variant = createVariant()

    trackViewItem(createMockDetailedProduct(), {
      ...variant,
      price: { ...variant.price, hasCampaignReduction: true },
    })

    expect(mocks.track).toHaveBeenCalledWith(
      'view_product_detail',
      expect.objectContaining({ variant_id: '4242', campaign_id: '31' }),
    )
  })

  it('tracks select_item with the surface as the GA4 list id and list name', () => {
    const { trackSelectItem } = useProductEvents()

    trackSelectItem(createProduct(), {
      index: 2,
      product_list_type: 'search_results',
      product_list_id: 'sneaker',
      total: 23,
    })

    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'select_item',
        item_list_id: 'sneaker',
        item_list_name: 'search_results',
        ecommerce: {
          items: [
            expect.objectContaining({
              index: 2,
              item_id: '42',
              item_list_id: 'sneaker',
              item_list_name: 'search_results',
            }),
          ],
        },
      }),
    )
    expect(mocks.track).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith(
      'select_product',
      expect.objectContaining({
        product_list_type: 'search_results',
        product_list_id: 'sneaker',
        position: 2,
        total: 23,
      }),
    )
  })

  it('prefers the list-wide position over the page index for select_product', () => {
    const { trackSelectItem } = useProductEvents()

    trackSelectItem(createProduct(), {
      index: 2,
      position: 26,
      product_list_type: 'category',
      total: 96,
    })

    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({
        ecommerce: { items: [expect.objectContaining({ index: 2 })] },
      }),
    )
    expect(mocks.track).toHaveBeenCalledWith(
      'select_product',
      expect.objectContaining({ position: 26, total: 96 }),
    )
  })

  it('reports the variant a tile prices on select_item and select_product', () => {
    const { trackSelectItem } = useProductEvents()

    trackSelectItem(createProduct({ id: 1 }), {
      index: 2,
      product_list_type: 'gift_selection',
      product_list_id: 'bxgy-1',
      total: 3,
      variant: createVariant(),
    })

    expect(mocks.push.mock.calls[0]![0].ecommerce.items[0]).toMatchObject({
      item_variant_id: '4242',
      item_variant: 'M',
      price: 24.99,
    })
    expect(mocks.track).toHaveBeenCalledWith(
      'select_product',
      expect.objectContaining({
        variant_id: '4242',
        product_list_type: 'gift_selection',
        product_list_id: 'bxgy-1',
        position: 2,
        total: 3,
      }),
    )
  })

  it('tracks view_item_list with the surface and one-based indexes', () => {
    const { trackViewItemList } = useProductEvents()

    trackViewItemList([createProduct({ id: 1 }), createProduct({ id: 2 })], {
      product_list_type: 'category',
      product_list_id: '50342',
      total: 96,
    })

    const event = mocks.push.mock.calls[0]?.[0]
    expect(event).toMatchObject({
      event: 'view_item_list',
      item_list_id: '50342',
      item_list_name: 'category',
    })
    expect(event.ecommerce.items).toEqual([
      expect.objectContaining({
        item_id: '1',
        index: 1,
        item_list_id: '50342',
        item_list_name: 'category',
      }),
      expect.objectContaining({ item_id: '2', index: 2 }),
    ])
  })

  it('tracks view_product_list with the list total next to view_item_list', () => {
    const { trackViewItemList } = useProductEvents()

    trackViewItemList([createProduct({ id: 1 })], {
      product_list_type: 'search_results',
      product_list_id: 'sneaker',
      total: 23,
    })

    expect(mocks.track).toHaveBeenCalledWith('view_product_list', {
      product_list_type: 'search_results',
      product_list_id: 'sneaker',
      total: 23,
    })
  })

  it('leaves item_list_id out for a list without an id', () => {
    const { trackViewItemList } = useProductEvents()

    trackViewItemList([createProduct({ id: 1 })], {
      product_list_type: 'wishlist',
      total: 1,
    })

    expect(mocks.push.mock.calls[0]![0].item_list_id).toBeUndefined()
  })

  it('reports a GA4 list id on view_item_list and the slider id on view_product_list', () => {
    const { trackViewItemList } = useProductEvents()

    trackViewItemList([createProduct({ id: 1 })], {
      product_list_type: 'product_slider',
      product_list_id: 'trending',
      total: 1,
      itemListSurface: {
        product_list_type: 'product_slider',
        product_list_id: 'add_to_basket_recommendations',
      },
    })

    const event = mocks.push.mock.calls[0]![0]
    expect(event).toMatchObject({
      item_list_id: 'add_to_basket_recommendations',
      item_list_name: 'product_slider',
    })
    expect(event.ecommerce.items[0]).toMatchObject({
      item_list_id: 'add_to_basket_recommendations',
    })
    expect(mocks.track).toHaveBeenCalledWith('view_product_list', {
      product_list_type: 'product_slider',
      product_list_id: 'trending',
      total: 1,
    })
  })

  it('reports a GA4 list id on select_item and the slider id on select_product', () => {
    const { trackSelectItem } = useProductEvents()

    trackSelectItem(createProduct(), {
      index: 1,
      product_list_type: 'product_slider',
      product_list_id: 'trending',
      total: 6,
      itemListSurface: {
        product_list_type: 'product_slider',
        product_list_id: 'add_to_basket_recommendations',
      },
    })

    const event = mocks.push.mock.calls[0]![0]
    expect(event.item_list_id).toBe('add_to_basket_recommendations')
    expect(event.ecommerce.items[0].item_list_id).toBe(
      'add_to_basket_recommendations',
    )
    expect(mocks.track).toHaveBeenCalledWith(
      'select_product',
      expect.objectContaining({ product_list_id: 'trending' }),
    )
    expect(mocks.track.mock.calls[0]![1]).not.toHaveProperty('itemListSurface')
  })

  it('tracks view_product_tile for one tile with its list-wide position', () => {
    const { trackViewProductTile } = useProductEvents()

    trackViewProductTile(createProduct({ id: 1 }), {
      product_list_type: 'category',
      product_list_id: '50342',
      position: 25,
      total: 96,
    })

    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.track).toHaveBeenCalledWith(
      'view_product_tile',
      expect.objectContaining({
        product_list_type: 'category',
        product_list_id: '50342',
        position: 25,
        total: 96,
      }),
    )
  })

  it('reports the variant a tile prices as variant_id and price', () => {
    const { trackViewProductTile } = useProductEvents()

    trackViewProductTile(createProduct({ id: 1 }), {
      product_list_type: 'gift_selection',
      product_list_id: 'bxgy-1',
      position: 2,
      total: 3,
      variant: createVariant(),
    })

    expect(mocks.track).toHaveBeenCalledWith(
      'view_product_tile',
      expect.objectContaining({
        variant_id: '4242',
        product_list_type: 'gift_selection',
        product_list_id: 'bxgy-1',
        position: 2,
        total: 3,
      }),
    )
  })

  it('tracks nothing for an empty product list', () => {
    const { trackViewItemList } = useProductEvents()

    trackViewItemList([], { product_list_type: 'product_slider', total: 0 })

    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.track).not.toHaveBeenCalled()
  })

  it('tracks the product detail view with the active variant', () => {
    const { trackViewItem } = useProductEvents()
    const product = createMockDetailedProduct({
      ...createProduct(),
      variants: [createVariant()],
    })

    trackViewItem(product, createVariant())

    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'view_item' }),
    )
    expect(mocks.track).toHaveBeenCalledWith(
      'view_product_detail',
      expect.objectContaining({
        variant_id: '4242',
        product_list_type: null,
        product_list_id: null,
      }),
    )
  })

  it('tracks the product detail view from the product price without a variant', () => {
    const { trackViewItem } = useProductEvents()

    trackViewItem(createMockDetailedProduct(createProduct()))

    expect(mocks.track).toHaveBeenCalledWith(
      'view_product_detail',
      expect.objectContaining({
        variant_id: undefined,
        price: 2999,
        discount: 1000,
      }),
    )
  })

  it('tracks apply_filter without a GA4 counterpart', () => {
    const { trackApplyFilter } = useProductEvents()
    const payload = {
      filter_slug: 'size',
      filter_value: '42',
      filter_action: 'add' as const,
      product_list_type: 'category' as const,
      product_list_id: '50342',
      active_filters: 3,
      result_count: 23,
    }

    trackApplyFilter(payload)

    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.track).toHaveBeenCalledWith('apply_filter', payload)
  })
})
