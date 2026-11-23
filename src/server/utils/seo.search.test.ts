import { describe, expect, it } from 'vitest'
import { createMockListingProduct } from '../../test/mock-data/products'
import { createMockStorefrontContext } from '../../test/utils/context'
import { getSearchJsonLd } from './seo'

describe('getSearchJsonLd', () => {
  // The ItemList shape is covered by `generateProductListingItemListSchema` in
  // seo.listing.test.ts; this checks only what the search wrapper adds.
  it('names the ItemList after the search title and links products with the country prefix', () => {
    const result = getSearchJsonLd({
      products: [
        createMockListingProduct({ id: 200, link: '/p/listing-shoe-200' }),
      ],
      storefront: createMockStorefrontContext({
        config: { countrySelector: 'path' },
        country: { path: 'de', isDefault: false },
      }),
      origin: 'https://shop.example.com',
      listName: 'Products for "shoe"',
    })

    expect(result).toMatchObject({
      '@type': 'ItemList',
      name: 'Products for "shoe"',
      itemListElement: [
        { item: { url: 'https://shop.example.com/de/p/listing-shoe-200' } },
      ],
    })
  })
})
