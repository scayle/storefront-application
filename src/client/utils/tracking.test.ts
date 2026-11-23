import type { PageProps } from '@shared/types/PageProps'
import { describe, expect, it } from 'vitest'
import type { BasketItem, ProductVariant } from '@scayle/storefront/types'
import { createMockBasketItem } from '../../test/mock-data/basket'
import {
  createMockDetailedProduct,
  createMockListingProduct,
  createMockProductVariant,
  createMockVariantPrice,
} from '../../test/mock-data/products'
import {
  createMockCampaign,
  createMockPromotion,
} from '../../test/mock-data/promotions'
import {
  createMockCategorySuggestion,
  createMockNavigationItemSuggestion,
  createMockProductSuggestion,
} from '../../test/mock-data/search'
import {
  getTrackingDiscount,
  mapBasketItemForAnalytics,
  mapBasketItemToTracking,
  mapProductForAnalytics,
  mapProductForTracking,
  mapSearchSuggestionForAnalytics,
  mapVariantForTracking,
} from './tracking'

/** The PDP fixture's variant: label `M`, 10 in stock, $9.99 final price. */
const pdpVariant = createMockDetailedProduct().variants[0]!

const withPrice = (
  price: Partial<ProductVariant['price']>,
): ProductVariant => ({
  ...pdpVariant,
  price: { ...pdpVariant.price, ...price },
})

/** Builds a line of variant 99 (size 42) of the product 42, `Sneaker` by `Acme`. */
const createItem = (overrides: Partial<BasketItem>): BasketItem =>
  createMockBasketItem({
    product: createMockListingProduct({
      id: 42,
      name: 'Sneaker',
      brand: 'Acme',
    }),
    variant: createMockProductVariant({ id: 99, label: '42' }),
    ...overrides,
  })

describe('getTrackingDiscount', () => {
  it.for([
    [undefined, undefined],
    [0, 0],
    [500, 5],
  ] as const)(
    'converts a total reduction of %s cents to %s',
    ([totalReductionInCents, expected]) => {
      expect(
        getTrackingDiscount(createMockVariantPrice({ totalReductionInCents })),
      ).toBe(expected)
    },
  )
})

describe('mapVariantForTracking', () => {
  it('maps the variant id and label with the price in currency units', () => {
    expect(
      mapVariantForTracking(withPrice({ totalReductionInCents: 300 })),
    ).toEqual({
      item_variant_id: '1',
      item_variant: 'M',
      price: 9.99,
      discount: 3,
    })
  })

  it('omits the discount when the variant price carries no reduction', () => {
    expect(mapVariantForTracking(pdpVariant!)).toEqual({
      item_variant_id: '1',
      item_variant: 'M',
      price: 9.99,
      discount: undefined,
    })
  })
})

describe('mapProductForTracking', () => {
  it('maps the product identity, brand and price in currency units', () => {
    const product = createMockListingProduct({
      id: 42,
      name: 'Trail Runner',
      brand: 'Acme',
    })

    expect(mapProductForTracking(product)).toMatchObject({
      item_id: '42',
      item_name: 'Trail Runner',
      item_brand: 'Acme',
      price: 9.99,
    })
  })

  it('omits the brand when the product has no brand attribute value', () => {
    const product = createMockListingProduct({ brand: '' })

    expect(mapProductForTracking(product).item_brand).toBeUndefined()
  })

  it('reports the per-unit discount from the product price', () => {
    const base = createMockListingProduct()
    const product = createMockListingProduct({
      price: { ...base.price, totalReductionInCents: 300 },
    })

    expect(mapProductForTracking(product).discount).toBe(3)
  })

  it('fills the five GA4 category levels from the breadcrumb trail', () => {
    const product = createMockDetailedProduct({
      breadcrumbs: ['Home', 'Men', 'Shoes', 'Sneakers', 'Running', 'Trail'].map(
        (value) => ({ to: `/c/${value.toLowerCase()}`, value }),
      ),
    })

    const item = mapProductForTracking(product)

    expect(item).toMatchObject({
      item_category: 'Home',
      item_category2: 'Men',
      item_category3: 'Shoes',
      item_category4: 'Sneakers',
      item_category5: 'Running',
    })
    // GA4 items carry five category levels, so the sixth crumb has nowhere to go.
    expect(Object.values(item)).not.toContain('Trail')
  })

  it('leaves the category levels unset on a listing product', () => {
    expect(mapProductForTracking(createMockListingProduct())).toMatchObject({
      item_category: undefined,
      item_category2: undefined,
      item_category3: undefined,
      item_category4: undefined,
      item_category5: undefined,
    })
  })
})

describe('mapBasketItemToTracking', () => {
  it('maps an item with a consolidated discount from unit price', () => {
    const item = createItem({
      quantity: 2,
      unitPrice: createMockVariantPrice({
        finalPriceInCents: 2499,
        totalReductionInCents: 500,
      }),
    })

    const result = mapBasketItemToTracking(item, 0)

    // One product and one variant field show both mappers are spread in;
    // their own tests cover the rest of each.
    expect(result).toMatchObject({
      item_id: '42',
      item_variant_id: '99',
      quantity: 2,
      price: 24.99,
      discount: 5,
      index: 0,
    })
  })

  it('maps a free gift item with the full unit price as discount', () => {
    const item = createItem({
      key: 'gift-1',
      quantity: 1,
      unitPrice: createMockVariantPrice({
        finalPriceInCents: 0,
        totalReductionInCents: 1999,
      }),
    })

    const result = mapBasketItemToTracking(item)

    expect(result.price).toBeCloseTo(0)
    expect(result.discount).toBeCloseTo(19.99)
    expect(result.index).toBeUndefined()
  })

  it('omits discount when there is no reduction', () => {
    const item = createItem({
      quantity: 1,
      unitPrice: createMockVariantPrice({ finalPriceInCents: 2999 }),
    })

    const result = mapBasketItemToTracking(item)

    expect(result.price).toBeCloseTo(29.99)
    expect(result.discount).toBeUndefined()
  })
})

describe('mapBasketItemForAnalytics', () => {
  it('maps the line with the basket unit price, its quantity and the applied promotion ids', () => {
    const item = createItem({
      quantity: 2,
      unitPrice: createMockVariantPrice({
        finalPriceInCents: 2499,
        totalReductionInCents: 500,
      }),
      promotions: [
        createMockPromotion({ id: 'promo-a' }),
        createMockPromotion({ id: 'promo-b' }),
      ],
    })

    expect(mapBasketItemForAnalytics(item, { position: 2, total: 3 })).toEqual({
      product_id: '42',
      brand_id: undefined,
      variant_id: '99',
      price: 2499,
      discount: 500,
      quantity: 2,
      promotion_ids: ['promo-a', 'promo-b'],
      position: 2,
      total: 3,
    })
  })

  it('sends an empty promotion list and no position outside a set', () => {
    const result = mapBasketItemForAnalytics(createItem({ quantity: 1 }))

    expect(result.promotion_ids).toEqual([])
    expect(result.position).toBeUndefined()
    expect(result.total).toBeUndefined()
    expect(result.discount).toBeUndefined()
  })

  it('reports the active campaign when the basket unit price carries a campaign reduction', () => {
    const item = createItem({ quantity: 1 })
    item.unitPrice = { ...item.unitPrice, hasCampaignReduction: true }

    expect(
      mapBasketItemForAnalytics(item, { campaignId: '31' }).campaign_id,
    ).toBe('31')
  })
})

describe('mapProductForAnalytics', () => {
  const variant = createMockProductVariant({
    id: 4242,
    price: createMockVariantPrice({
      finalPriceInCents: 2499,
      totalReductionInCents: 500,
    }),
  })

  const base = createMockListingProduct()

  it('flattens the product with minor-unit money and the brand attribute id', () => {
    const product = createMockListingProduct({
      id: 42,
      brand: 'Acme',
      brandId: 7,
      price: {
        ...base.price,
        finalPriceInCents: 2999,
        totalReductionInCents: 1000,
      },
    })

    expect(mapProductForAnalytics(product)).toEqual({
      product_id: '42',
      brand_id: '7',
      variant_id: undefined,
      price: 2999,
      discount: 1000,
    })
  })

  it('omits the brand without an attribute id and a zero discount', () => {
    const product = createMockListingProduct({
      brand: 'Acme',
      brandId: undefined,
      price: { ...base.price, totalReductionInCents: 0 },
    })

    expect(mapProductForAnalytics(product)).toMatchObject({
      brand_id: undefined,
      discount: undefined,
    })
  })

  it('prefers the variant price and id when a variant is given', () => {
    const product = createMockListingProduct({ id: 42 })

    expect(mapProductForAnalytics(product, { variant })).toMatchObject({
      product_id: '42',
      variant_id: '4242',
      price: 2499,
      discount: 500,
    })
  })

  it('reports the active campaign only for a price with a campaign reduction', () => {
    const campaign = createMockCampaign({ id: '31' })
    const inCampaign = createMockListingProduct({
      price: { ...base.price, hasCampaignReduction: true },
    })
    const regular = createMockListingProduct({
      price: { ...base.price, hasCampaignReduction: false },
    })

    expect(
      mapProductForAnalytics(inCampaign, { campaignId: campaign.id })
        .campaign_id,
    ).toBe('31')
    expect(
      mapProductForAnalytics(regular, { campaignId: campaign.id }).campaign_id,
    ).toBeUndefined()
    expect(mapProductForAnalytics(inCampaign).campaign_id).toBeUndefined()
  })

  it('reads the campaign reduction off the variant price when a variant is given', () => {
    const campaign = createMockCampaign({ id: '31' })
    const product = createMockListingProduct({
      price: { ...base.price, hasCampaignReduction: true },
    })

    // The variant price is the one reported, so its own flag decides.
    expect(
      mapProductForAnalytics(product, { variant, campaignId: campaign.id })
        .campaign_id,
    ).toBeUndefined()
    expect(
      mapProductForAnalytics(product, {
        variant: {
          ...variant,
          price: { ...variant.price, hasCampaignReduction: true },
        },
        campaignId: campaign.id,
      }).campaign_id,
    ).toBe('31')
  })
})

describe('mapSearchSuggestionForAnalytics', () => {
  // A shop under the `path` country selector, so the real `localizeLink` adds
  // the `/de` prefix.
  const storefront = {
    config: { countrySelector: 'path' },
    country: { path: 'de' },
  } as unknown as PageProps['storefront']

  it('reads the id and link off the product of a product suggestion', () => {
    const item = createMockProductSuggestion({
      product: createMockListingProduct({ id: 42, link: '/p/sneaker-42' }),
    })

    expect(
      mapSearchSuggestionForAnalytics(
        storefront,
        { type: 'product', item },
        2,
        5,
        'sneak',
      ),
    ).toEqual({
      position: 2,
      total: 5,
      search_term: 'sneak',
      suggestion_type: 'product',
      suggestion_id: '42',
      suggestion_url: '/de/p/sneaker-42',
    })
  })

  it('reports the filter groups a category suggestion narrows its results by', () => {
    const item = createMockCategorySuggestion({
      id: 7,
      link: '/c/shoes-7?color=red',
      filters: [
        { key: 'color', label: 'Color', values: ['Red'] },
        { key: 'isAvailable', label: 'Available', values: ['Yes'] },
      ],
    })

    expect(
      mapSearchSuggestionForAnalytics(
        storefront,
        { type: 'category', item },
        1,
        3,
        'shoe',
      ),
    ).toEqual({
      position: 1,
      total: 3,
      search_term: 'shoe',
      suggestion_type: 'category',
      suggestion_id: '7',
      suggestion_url: '/de/c/shoes-7?color=red',
      suggestion_filter_groups: ['color', 'isAvailable'],
    })
  })

  it('omits the filter groups for a category suggestion without filters', () => {
    const item = createMockCategorySuggestion({ filters: [] })

    expect(
      mapSearchSuggestionForAnalytics(
        storefront,
        { type: 'category', item },
        1,
        1,
        'shoe',
      ),
    ).not.toHaveProperty('suggestion_filter_groups')
  })

  it('maps a navigation item to the snake_case suggestion type', () => {
    const item = createMockNavigationItemSuggestion({
      id: 9,
      link: '/content/sale',
    })

    expect(
      mapSearchSuggestionForAnalytics(
        storefront,
        { type: 'navigationItem', item },
        3,
        3,
        'sale',
      ),
    ).toMatchObject({
      suggestion_type: 'navigation_item',
      suggestion_id: '9',
      suggestion_url: '/de/content/sale',
    })
  })
})
