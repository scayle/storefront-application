import { describe, it, expect } from 'vitest'
import type {
  Attributes,
  Product as StorefrontAPIProduct,
} from '@scayle/storefront-api'
import {
  createApiPrice,
  createApiProduct,
  createApiVariant,
} from '@scayle/storefront/test'
import { LOW_STOCK_THRESHOLD } from '@server/constants'
import {
  ATTRIBUTE_KEY_APPLY_PADDING,
  ATTRIBUTE_KEY_IMAGE_TYPE,
} from '@shared/constants/attributeKeys'
import { MAX_GALLERY_VIDEOS } from '@shared/constants/productGallery'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { ProductMapperService } from './product-mapper'
import { CategoryMapperService } from './category-mapper'

function createApiAttributes(labels: Record<string, string>): Attributes {
  return Object.fromEntries(
    Object.entries(labels).map(([key, label]) => [
      key,
      {
        id: null,
        key,
        label,
        type: null,
        multiSelect: false,
        values: { id: 1, label, value: label },
      },
    ]),
  )
}

const defaultAttributes = createApiAttributes({
  name: 'Test Product',
  brand: 'Acme',
  color: 'Black',
})

// The detail includes request `priceRange`, so the mapper reads it on every
// product.
function createApiDetailedProduct(
  overrides: Partial<StorefrontAPIProduct> = {},
): StorefrontAPIProduct {
  return createApiProduct({
    attributes: defaultAttributes,
    priceRange: { min: createApiPrice(), max: createApiPrice() },
    ...overrides,
  })
}

describe('ProductMapperService (detail)', () => {
  const context = createMockStorefrontContext()
  const mappers = createMockMapperRegistry(context, {
    category: new CategoryMapperService(context),
  })
  const service = new ProductMapperService(context, mappers)

  describe('getPath', () => {
    it('returns product detail route using name attribute', () => {
      expect(service.getPath(createApiDetailedProduct())).toBe(
        '/p/test-product-1',
      )
    })

    it('falls back to the product slug when the name attribute is missing', () => {
      const product = createApiDetailedProduct({ attributes: {} })
      expect(service.getPath(product)).toBe('/p/product-1')
    })
  })

  describe('includes', () => {
    // `getPath` builds the product link from the name attribute, so every
    // query whose products get a link has to request it. Keys a shop adds
    // keep this passing.
    it.for([
      {
        query: 'listing',
        includes: service.Includes,
        attributes: { withKey: expect.arrayContaining(['name']) },
      },
      {
        query: 'detail',
        includes: service.DetailedIncludes,
        attributes: 'all',
      },
      {
        query: 'hreflang',
        includes: service.HreflangIncludes,
        attributes: { withKey: expect.arrayContaining(['name']) },
      },
    ])(
      'requests the name attribute in the $query includes',
      ({ includes, attributes }) => {
        expect(includes.attributes).toEqual(attributes)
      },
    )

    it.for([
      { query: 'listing', includes: service.Includes },
      { query: 'detail', includes: service.DetailedIncludes },
    ])(
      'requests only the image attributes the image mapping reads in the $query includes',
      ({ includes }) => {
        expect(includes.images).toEqual({
          attributes: {
            withKey: [ATTRIBUTE_KEY_APPLY_PADDING, ATTRIBUTE_KEY_IMAGE_TYPE],
          },
        })
      },
    )
  })

  describe('mapDetailedProduct', () => {
    it('links the product to its detail page and adds its color', () => {
      expect(
        service.mapDetailedProduct(createApiDetailedProduct()),
      ).toMatchObject({
        link: '/p/test-product-1',
        color: 'Black',
      })
    })

    it('caps mapped videos at MAX_GALLERY_VIDEOS', () => {
      const product = createApiDetailedProduct({
        videos: Array.from({ length: MAX_GALLERY_VIDEOS + 2 }, (_, index) => ({
          path: `videos/v${index}.mp4`,
          url: `https://acme.cdn.scayle.cloud/videos/v${index}.mp4`,
        })),
      })
      const result = service.mapDetailedProduct(product)

      expect(result.videos).toHaveLength(MAX_GALLERY_VIDEOS)
      expect(result.videos[0]?.url).toBe(
        'https://acme.cdn.scayle.cloud/videos/v0.mp4',
      )
      expect(result.videos.at(-1)?.url).toBe(
        `https://acme.cdn.scayle.cloud/videos/v${MAX_GALLERY_VIDEOS - 1}.mp4`,
      )
    })

    it('maps storefrontBadge from attributes when present', () => {
      const product = createApiDetailedProduct({
        attributes: {
          ...defaultAttributes,
          ...createApiAttributes({ storefrontBadge: 'Sale' }),
        },
      })
      const result = service.mapDetailedProduct(product)
      expect(result.badge).toBe('Sale')
    })

    it('maps images and resolves image URLs via utils', () => {
      const product = createApiDetailedProduct({
        images: [{ hash: 'abc123', name: 'abc123.jpg' }],
      })
      const result = service.mapDetailedProduct(product)

      expect(result.images).toHaveLength(1)
      expect(result.images[0]!.url).toBe(
        'https://test-tenant-space.cdn.scayle.cloud/abc123',
      )
    })

    it('maps details from product attributes when types match', () => {
      const product = createApiDetailedProduct({
        attributes: {
          ...defaultAttributes,
          extras: {
            id: 1,
            key: 'extras',
            label: 'Extras',
            type: 'extras',
            multiSelect: true,
            values: [{ label: 'Pockets' }, { label: 'Hood' }],
          },
          fit_size: {
            id: 2,
            key: 'fit_size',
            label: 'Fit',
            type: 'fit_size',
            multiSelect: false,
            values: { label: 'Regular' },
          },
        },
      })
      const result = service.mapDetailedProduct(product)

      expect(result.details).toEqual([
        {
          key: 'fit_size',
          label: mappers.i18n.t('product_details.information.fit_size'),
          content: ['Fit: Regular'],
        },
        {
          key: 'extras',
          label: mappers.i18n.t('product_details.information.extras'),
          content: ['Pockets', 'Hood'],
        },
      ])
    })

    it('returns an empty array when product has no attributes', () => {
      const product = createApiDetailedProduct({ attributes: undefined })
      const result = service.mapDetailedProduct(product)
      expect(result.details).toEqual([])
    })

    it('attaches the product description as the design section intro', () => {
      const product = createApiDetailedProduct({
        attributes: {
          ...defaultAttributes,
          ...createApiAttributes({
            description: 'Soft cotton blend with a relaxed fit.',
          }),
          design: {
            id: 1,
            key: 'design',
            label: 'Design',
            type: 'design',
            multiSelect: false,
            values: { label: 'Striped' },
          },
        },
      })
      const result = service.mapDetailedProduct(product)

      expect(result.details).toEqual([
        {
          key: 'design',
          label: mappers.i18n.t('product_details.information.design'),
          intro: 'Soft cotton blend with a relaxed fit.',
          content: ['Design: Striped'],
        },
      ])
    })

    it('maps description from description attribute when present', () => {
      const product = createApiDetailedProduct({
        attributes: {
          ...defaultAttributes,
          ...createApiAttributes({
            description: 'Soft cotton blend with a relaxed fit.',
          }),
        },
      })
      const result = service.mapDetailedProduct(product)
      expect(result.description).toBe('Soft cotton blend with a relaxed fit.')
    })

    it('omits description when description attribute is missing', () => {
      const result = service.mapDetailedProduct(createApiDetailedProduct())
      expect(result.description).toBeUndefined()
    })
  })

  describe('mapVariant', () => {
    // `ProductMapper` is abstract, so the fields only `super` sets stand in for
    // a comparison with a base instance.
    it('keeps the base variant fields next to the size label', () => {
      const variant = createApiVariant({
        attributes: createApiAttributes({ size: 'M' }),
      })

      expect(service.mapVariant(variant)).toMatchObject({
        id: variant.id,
        referenceKey: variant.referenceKey,
        label: 'M',
      })
    })

    it('uses empty size when size attribute missing', () => {
      const result = service.mapVariant(createApiVariant())
      expect(result.label).toBe('')
    })

    it.for([
      { quantity: LOW_STOCK_THRESHOLD, isLowStock: true },
      { quantity: LOW_STOCK_THRESHOLD + 1, isLowStock: false },
      { quantity: 0, isLowStock: false },
    ])(
      'sets isLowStock to $isLowStock for a stock of $quantity',
      ({ quantity, isLowStock }) => {
        const variant = createApiVariant({
          stock: { ...createApiVariant().stock, quantity },
        })

        expect(service.mapVariant(variant).isLowStock).toBe(isLowStock)
      },
    )

    // The base mapper derives the subscription block; this guards the tenant
    // override from dropping it while layering the size label on top.
    it('keeps the base subscription data when the variant is subscription-eligible', () => {
      const variant = createApiVariant({
        attributes: {
          ...createApiAttributes({
            subscriptionEligibility: 'true',
            subscriptionTerm: 'No_minimum_term',
            subscriptionCancellationPolicy: 'Can_cancel_anytime',
          }),
          subscriptionAvailableIntervals: {
            id: null,
            key: 'subscriptionAvailableIntervals',
            label: 'Intervals',
            type: null,
            multiSelect: true,
            values: [{ label: 'Every 4 weeks', id: 2, value: 'monthly' }],
          },
        },
      })

      expect(service.mapVariant(variant).subscription?.term).toBe(
        'No_minimum_term',
      )
    })

    it('omits subscription when eligibility is "false"', () => {
      const variant = createApiVariant({
        attributes: createApiAttributes({ subscriptionEligibility: 'false' }),
      })

      expect(service.mapVariant(variant).subscription).toBeUndefined()
    })
  })
})
