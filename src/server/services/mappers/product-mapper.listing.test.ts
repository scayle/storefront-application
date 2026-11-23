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
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
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

// The listing includes request `priceRange`, so the mapper reads it on every
// product.
function createApiListedProduct(
  overrides: Partial<StorefrontAPIProduct> = {},
): StorefrontAPIProduct {
  return createApiProduct({
    attributes: createApiAttributes({ name: 'Test Product', brand: 'Acme' }),
    priceRange: { min: createApiPrice(), max: createApiPrice() },
    ...overrides,
  })
}

describe('ProductMapperService (listing)', () => {
  const context = createMockStorefrontContext()
  const service = new ProductMapperService(
    context,
    createMockMapperRegistry(context, {
      category: new CategoryMapperService(context),
    }),
  )

  describe('mapProduct', () => {
    it('links the product to its detail page and adds its color', () => {
      const product = createApiListedProduct({
        attributes: createApiAttributes({ name: 'Test Product', color: 'Red' }),
      })

      expect(service.mapProduct(product)).toMatchObject({
        link: '/p/test-product-1',
        color: 'Red',
      })
    })

    it('maps storefrontBadge from attributes when present', () => {
      const product = createApiListedProduct({
        attributes: createApiAttributes({
          name: 'Test Product',
          storefrontBadge: 'Sale',
        }),
      })

      expect(service.mapProduct(product).badge).toBe('Sale')
    })

    it('keeps the base sibling mapping and adds the color, empty when it has none', () => {
      const product = createApiListedProduct({
        siblings: [
          createApiProduct({
            id: 2,
            attributes: createApiAttributes({ name: 'Red', color: 'Red' }),
          }),
          createApiProduct({
            id: 3,
            attributes: createApiAttributes({ name: 'Plain' }),
          }),
        ],
      })

      expect(
        service.mapProduct(product).siblings?.map(({ id, color }) => ({
          id,
          color,
        })),
      ).toEqual([
        { id: 2, color: 'Red' },
        { id: 3, color: '' },
      ])
    })

    it('flags the product as low on stock up to the shop low-stock threshold', () => {
      const withStock = (quantity: number) =>
        createApiListedProduct({
          variants: [
            createApiVariant({
              stock: { ...createApiVariant().stock, quantity },
            }),
          ],
        })

      expect(
        service.mapProduct(withStock(LOW_STOCK_THRESHOLD)).isLowStock,
      ).toBe(true)
      expect(
        service.mapProduct(withStock(LOW_STOCK_THRESHOLD + 1)).isLowStock,
      ).toBe(false)
    })
  })

  describe('mapPagination', () => {
    it('shows every page button up to the shop visible page count', () => {
      const withLastPage = (last: number) =>
        service.mapPagination({
          current: 1,
          total: last * 32,
          perPage: 32,
          page: 1,
          first: 1,
          prev: 1,
          next: 2,
          last,
        })

      expect(withLastPage(VISIBLE_PAGE_COUNT).hasTrailingEllipsis).toBe(false)
      expect(withLastPage(VISIBLE_PAGE_COUNT + 1).hasTrailingEllipsis).toBe(
        true,
      )
    })
  })
})
