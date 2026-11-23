import { describe, expect, it } from 'vitest'
import type { DetailedProduct } from '@scayle/storefront/types'
import {
  createMockDetailedProduct,
  createMockProductVariant,
  createMockVariantPrice,
} from '../../test/mock-data/products'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { getProductJsonLd as buildProductJsonLd } from './seo'

const storefront = createMockStorefrontContext({
  config: { countrySelector: 'path' },
  country: { path: 'de', isDefault: false },
})
const i18n = createMockMapperRegistry(storefront).i18n
const getProductJsonLd = (product: DetailedProduct, pageUrl: string) =>
  buildProductJsonLd(
    product,
    pageUrl,
    storefront,
    new URL(pageUrl).origin,
    i18n,
  )

const baseProduct = createMockDetailedProduct({
  id: 100,
  name: 'Demo Product',
  color: 'Black',
  brand: 'DemoBrand',
  images: [],
  variants: [],
  breadcrumbs: [
    // Keep links without the country prefix (`/c/...`, not `/de/c/...`), as real mappers return them, or the tests pass even when the prefix is never added.
    { to: '/c/category-1', value: 'Category' },
    { to: '/c/category-1/sub-2', value: 'Subcategory' },
  ],
})

describe('getProductJsonLd', () => {
  it('returns the ProductGroup followed by the BreadcrumbList', () => {
    const pageUrl = 'https://shop.example.com/de/p/demo-product-100'
    const result = getProductJsonLd(baseProduct, pageUrl)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      '@type': 'ProductGroup',
      productGroupID: '100',
      name: 'Demo Product, Black',
      description: 'Demo Product',
      brand: { '@type': 'Brand', name: 'DemoBrand' },
      color: 'Black',
    })
    // No images on baseProduct → image field is omitted
    expect(result[0]).not.toHaveProperty('image')
    expect(result[1]).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          position: 1,
          name: 'Category',
          item: 'https://shop.example.com/de/c/category-1',
        },
        {
          position: 2,
          name: 'Subcategory',
          item: 'https://shop.example.com/de/c/category-1/sub-2',
        },
      ],
    })
  })

  it('uses the product description when set', () => {
    const result = getProductJsonLd(
      { ...baseProduct, description: 'Full product description.' },
      'https://example.com/p/1',
    )

    expect(result[0].description).toBe('Full product description.')
  })

  it('falls back to the product name when the product has no description', () => {
    const result = getProductJsonLd(
      { ...baseProduct, description: undefined },
      'https://example.com/p/1',
    )

    expect(result[0].description).toBe('Demo Product')
  })

  it('attaches VideoObject nodes for rendered videos that have a poster', () => {
    const result = getProductJsonLd(
      {
        ...baseProduct,
        description: '<p>A jacket with <strong>wool</strong>.</p>',
        images: [
          {
            url: 'https://cdn.example.com/a.jpg',
            name: 'a.jpg',
            applyPadding: false,
          },
          {
            url: 'https://cdn.example.com/b.jpg',
            name: 'b.jpg',
            applyPadding: false,
          },
        ],
        videos: [
          {
            url: 'https://acme.cdn.scayle.cloud/videos/hero.mp4',
            posterUrl:
              'https://acme.cdn.scayle.cloud/so_0,f_jpg/videos/hero.mp4',
          },
          { url: 'https://cdn.example.com/external.mp4' },
        ],
      },
      'https://example.com/p/1',
    )

    expect(result[0].subjectOf).toEqual([
      {
        '@type': 'VideoObject',
        name: 'Demo Product (Video 1)',
        contentUrl: 'https://acme.cdn.scayle.cloud/videos/hero.mp4',
        thumbnailUrl:
          'https://acme.cdn.scayle.cloud/so_0,f_jpg/videos/hero.mp4',
        description: 'A jacket with wool.',
      },
    ])
    expect(result[0].subjectOf).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uploadDate: expect.anything() }),
      ]),
    )
  })

  it('omits VideoObject description when the product has none', () => {
    const result = getProductJsonLd(
      {
        ...baseProduct,
        description: undefined,
        videos: [
          {
            url: 'https://acme.cdn.scayle.cloud/videos/hero.mp4',
            posterUrl:
              'https://acme.cdn.scayle.cloud/so_0,f_jpg/videos/hero.mp4',
          },
        ],
      },
      'https://example.com/p/1',
    )

    expect(result[0].subjectOf).toEqual([
      {
        '@type': 'VideoObject',
        name: 'Demo Product (Video 1)',
        contentUrl: 'https://acme.cdn.scayle.cloud/videos/hero.mp4',
        thumbnailUrl:
          'https://acme.cdn.scayle.cloud/so_0,f_jpg/videos/hero.mp4',
      },
    ])
  })

  it('omits subjectOf when no rendered video has a poster', () => {
    const result = getProductJsonLd(
      {
        ...baseProduct,
        videos: [{ url: 'https://cdn.example.com/external.mp4' }],
      },
      'https://example.com/p/1',
    )
    expect(result[0]).not.toHaveProperty('subjectOf')
  })

  it('returns empty breadcrumb itemListElement when product has no breadcrumbs', () => {
    const productNoBreadcrumbs = { ...baseProduct, breadcrumbs: [] }
    const result = getProductJsonLd(
      productNoBreadcrumbs,
      'https://example.com/p/1',
    )
    expect(result[1].itemListElement).toEqual([])
  })

  it('includes hasVariant with offers and variesBy when product has multiple variants', () => {
    const productWithVariants = {
      ...baseProduct,
      variants: [
        createMockProductVariant({
          id: 1,
          label: 'S',
          price: createMockVariantPrice({ finalPriceInCents: 2999 }),
          referenceKey: 'SKU-S',
        }),
        createMockProductVariant({
          id: 2,
          label: 'M',
          stock: 0,
          isSoldOut: true,
          price: createMockVariantPrice({ finalPriceInCents: 3499 }),
          referenceKey: 'SKU-M',
        }),
      ],
    }
    const result = getProductJsonLd(
      productWithVariants,
      'https://example.com/p/1',
    )
    const productGroup = result[0]
    const hasVariantList = Array.isArray(productGroup.hasVariant)
      ? productGroup.hasVariant
      : []
    expect(hasVariantList).toHaveLength(2)
    expect(hasVariantList[0]).toMatchObject({
      '@type': 'Product',
      name: 'Demo Product, Black (S)',
      size: 'S',
      offers: {
        '@type': 'Offer',
        sku: '1',
        mpn: 'SKU-S',
        price: 29.99,
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    })
    expect(hasVariantList[1].offers).toMatchObject({
      '@type': 'Offer',
      sku: '2',
      mpn: 'SKU-M',
      price: 34.99,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    })
    expect(productGroup.variesBy).toEqual(['https://schema.org/size'])
  })

  it('omits hasVariant and variesBy when product has zero variants', () => {
    const productNoVariants = { ...baseProduct, variants: [] }
    const result = getProductJsonLd(
      productNoVariants,
      'https://example.com/p/1',
    )
    const productGroup = result[0]
    expect(productGroup.hasVariant).toBeUndefined()
    expect(productGroup.variesBy).toBeUndefined()
  })

  it('includes hasVariant with one entry but no variesBy when product has single variant', () => {
    const productOneVariant = {
      ...baseProduct,
      variants: [createMockProductVariant({ label: 'One Size' })],
    }
    const result = getProductJsonLd(
      productOneVariant,
      'https://example.com/p/1',
    )
    const productGroup = result[0]
    const hasVariantList = Array.isArray(productGroup.hasVariant)
      ? productGroup.hasVariant
      : []
    expect(hasVariantList).toHaveLength(1)
    expect(productGroup.variesBy).toBeUndefined()
  })

  it('omits mpn in Offer when variant has no referenceKey', () => {
    const productVariantNoRef = {
      ...baseProduct,
      variants: [createMockProductVariant({ id: 99, referenceKey: undefined })],
    }
    const result = getProductJsonLd(
      productVariantNoRef,
      'https://example.com/p/1',
    )
    const hasVariantList = Array.isArray(result[0].hasVariant)
      ? result[0].hasVariant
      : []
    expect(hasVariantList[0].offers).not.toHaveProperty('mpn')
    expect(hasVariantList[0].offers.sku).toBe('99')
  })

  it('sizes the primary image url and passes it into the ProductGroup and variant schema', () => {
    const withLarge = {
      ...baseProduct,
      images: [
        {
          applyPadding: false,
          url: 'https://cdn.example.com/large.jpg',
          name: 'h2.jpg',
        },
      ],
      variants: [createMockProductVariant()],
    }
    const result = getProductJsonLd(withLarge, 'https://example.com/p/1')
    expect(result[0].image).toEqual([
      'https://cdn.example.com/large.jpg?quality=80&width=1200',
    ])
    const hasVariantList = Array.isArray(result[0].hasVariant)
      ? result[0].hasVariant
      : []
    expect(hasVariantList[0].image).toBe(
      'https://cdn.example.com/large.jpg?quality=80&width=1200',
    )
  })

  it('uses empty string for image in variant schema when product has no images', () => {
    const productWithVariantNoImages = {
      ...baseProduct,
      variants: [createMockProductVariant()],
    }
    const result = getProductJsonLd(
      productWithVariantNoImages,
      'https://example.com/p/1',
    )
    const hasVariantList = Array.isArray(result[0].hasVariant)
      ? result[0].hasVariant
      : []
    expect(hasVariantList[0].image).toBe('')
  })

  it('builds product URL from pageUrl pathname and search', () => {
    const productWithVariant = {
      ...baseProduct,
      variants: [createMockProductVariant({ id: 42 })],
    }
    const result = getProductJsonLd(
      productWithVariant,
      'https://example.com/de/p/product-1?variantId=42',
    )
    const hasVariantList = Array.isArray(result[0].hasVariant)
      ? result[0].hasVariant
      : []
    expect(hasVariantList[0].offers.url).toContain(
      'https://example.com/de/p/product-1',
    )
    expect(hasVariantList[0].offers.url).toContain('variantId=42')
  })
})
