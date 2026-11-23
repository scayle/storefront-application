import { describe, expect, it } from 'vitest'
import type { StorefrontContext } from '@scayle/storefront'
import { createMockCategory } from '../../test/mock-data/categories'
import { createMockListingProduct } from '../../test/mock-data/products'
import { createMockStorefrontContext } from '../../test/utils/context'
import {
  generateCategoryBreadcrumbSchema,
  generateListingProductSchema,
  generateProductListingItemListSchema,
  getProductListingJsonLd,
} from './seo'

const origin = 'https://shop.example.com'

const storefront = createMockStorefrontContext({
  config: { countrySelector: 'path' },
  country: { path: 'de', isDefault: false },
})

// Keep links without the country prefix (`/p/...`, not `/de/p/...`), as real mappers return them, or the tests pass even when the prefix is never added.
const baseListingProduct = createMockListingProduct({
  id: 200,
  name: 'Listing Shoe',
  link: '/p/listing-shoe-200',
  brand: 'TrailCo',
  color: 'Red',
  images: [],
})

describe('generateCategoryBreadcrumbSchema', () => {
  it('returns a single-item BreadcrumbList for a root category (no ancestors)', () => {
    const category = createMockCategory({
      id: 1,
      name: 'Category',
      link: '/c/category-1',
    })
    const result = generateCategoryBreadcrumbSchema(
      category,
      storefront,
      origin,
    )
    expect(result).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Category',
          item: 'https://shop.example.com/de/c/category-1',
        },
      ],
    })
  })

  it('appends the active category to the ancestor breadcrumbs with sequential positions', () => {
    const category = createMockCategory({
      id: 2,
      name: 'Women',
      link: '/c/shoes/women-2',
      breadcrumbs: [{ to: '/c/shoes-1', value: 'Shoes', id: 1 }],
    })
    const result = generateCategoryBreadcrumbSchema(
      category,
      storefront,
      origin,
    )
    const items = Array.isArray(result.itemListElement)
      ? result.itemListElement
      : []
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      position: 1,
      name: 'Shoes',
      item: 'https://shop.example.com/de/c/shoes-1',
    })
    expect(items[1]).toMatchObject({
      position: 2,
      name: 'Women',
      item: 'https://shop.example.com/de/c/shoes/women-2',
    })
  })
})

describe('generateListingProductSchema', () => {
  it('returns Product with Offer, absolute URLs, and converted price', () => {
    const product = {
      ...baseListingProduct,
      price: { ...baseListingProduct.price, finalPriceInCents: 4999 },
      images: [
        {
          url: 'https://cdn.example.com/tile.jpg',
          name: 'img-1.jpg',
          applyPadding: false,
        },
      ],
    }

    const result = generateListingProductSchema(product, storefront, origin)

    expect(result).toMatchObject({
      '@type': 'Product',
      name: 'Listing Shoe',
      color: 'Red',
      url: 'https://shop.example.com/de/p/listing-shoe-200',
      sku: '200',
      inProductGroupWithID: '200',
      brand: { '@type': 'Brand', name: 'TrailCo' },
      image: ['https://cdn.example.com/tile.jpg?quality=80&width=1200'],
      offers: {
        '@type': 'Offer',
        url: 'https://shop.example.com/de/p/listing-shoe-200',
        sku: '200',
        price: 49.99,
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    })
    expect(result).not.toHaveProperty('@context')
  })

  it('omits the image when the listing image has no url', () => {
    const product = {
      ...baseListingProduct,
      images: [{ url: '', name: 'img-1.jpg', applyPadding: false }],
    }

    const result = generateListingProductSchema(product, storefront, origin)

    expect(result.image).toBeUndefined()
  })

  it('marks offer OutOfStock when product is sold out', () => {
    const result = generateListingProductSchema(
      { ...baseListingProduct, isSoldOut: true },
      storefront,
      origin,
    )

    expect(result.offers).toMatchObject({
      availability: 'https://schema.org/OutOfStock',
    })
  })

  it('omits image when product has no images', () => {
    const result = generateListingProductSchema(
      baseListingProduct,
      storefront,
      origin,
    )

    expect(result).not.toHaveProperty('image')
  })
})

describe('generateProductListingItemListSchema', () => {
  it('returns ItemList with page-local positions starting at 1', () => {
    const products = [
      baseListingProduct,
      {
        ...baseListingProduct,
        id: 201,
        name: 'Second Shoe',
        link: '/p/201',
      },
    ]

    const result = generateProductListingItemListSchema({
      name: 'Shoes - Women',
      products,
      storefront,
      origin,
    })

    expect(result).toMatchObject({
      '@type': 'ItemList',
      name: 'Shoes - Women',
      numberOfItems: 2,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: { '@type': 'Product', sku: '200' },
        },
        {
          '@type': 'ListItem',
          position: 2,
          item: { '@type': 'Product', sku: '201' },
        },
      ],
    })
  })

  it('returns an empty itemListElement when there are no products', () => {
    const result = generateProductListingItemListSchema({
      name: 'Shoes',
      products: [],
      storefront,
      origin,
    })

    expect(result.itemListElement).toEqual([])
    expect(result.numberOfItems).toBe(0)
  })
})

describe('getProductListingJsonLd', () => {
  it('returns ItemList followed by BreadcrumbList', () => {
    const category = createMockCategory({
      name: 'Shoes',
      link: '/c/shoes-42',
      breadcrumbs: [{ to: '/c/women-1', value: 'Women', id: 1 }],
    })

    const result = getProductListingJsonLd({
      category,
      products: [baseListingProduct],
      storefront,
      origin,
      listingName: 'Shoes - Women',
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      '@type': 'ItemList',
      name: 'Shoes - Women',
      itemListElement: [{ position: 1 }],
    })
    expect(result[1]).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          position: 1,
          name: 'Women',
          item: 'https://shop.example.com/de/c/women-1',
        },
        {
          position: 2,
          name: 'Shoes',
          item: 'https://shop.example.com/de/c/shoes-42',
        },
      ],
    })
  })

  it.for<{
    condition: string
    context: StorefrontContext
    productUrl: string
    categoryUrl: string
  }>([
    {
      condition: 'path mode',
      context: storefront,
      productUrl: 'https://shop.example.com/de/p/listing-shoe-200',
      categoryUrl: 'https://shop.example.com/de/c/shoes-42',
    },
    {
      condition: 'path_except_default mode on a non-default country',
      context: createMockStorefrontContext({
        config: { countrySelector: 'path_except_default' },
        country: { path: 'de', isDefault: false },
      }),
      productUrl: 'https://shop.example.com/de/p/listing-shoe-200',
      categoryUrl: 'https://shop.example.com/de/c/shoes-42',
    },
    {
      condition: 'path_except_default mode on the default country',
      context: createMockStorefrontContext({
        config: { countrySelector: 'path_except_default' },
        country: { path: 'en', isDefault: true },
      }),
      productUrl: 'https://shop.example.com/p/listing-shoe-200',
      categoryUrl: 'https://shop.example.com/c/shoes-42',
    },
    {
      condition: 'domain mode',
      context: createMockStorefrontContext({
        config: { countrySelector: 'domain' },
        country: { domain: 'shop.example.com', isDefault: false },
      }),
      productUrl: 'https://shop.example.com/p/listing-shoe-200',
      categoryUrl: 'https://shop.example.com/c/shoes-42',
    },
  ])(
    'links products and breadcrumbs with the country prefix of $condition',
    ({ context, productUrl, categoryUrl }) => {
      const [itemList, breadcrumbList] = getProductListingJsonLd({
        category: createMockCategory({ name: 'Shoes', link: '/c/shoes-42' }),
        products: [baseListingProduct],
        storefront: context,
        origin,
        listingName: 'Shoes',
      })

      expect(itemList).toMatchObject({
        itemListElement: [
          { item: { url: productUrl, offers: { url: productUrl } } },
        ],
      })
      expect(breadcrumbList).toMatchObject({
        itemListElement: [{ item: categoryUrl }],
      })
    },
  )
})
