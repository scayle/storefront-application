import { describe, it, expect } from 'vitest'
import { createApiOrder, createApiOrderItem } from '@scayle/storefront/test'
import { OrderMapper } from '@scayle/storefront/mappers'
import { createMockStorefrontContext } from '../../../test/utils/context'
import { OrderMapperService } from './order-mapper'

// Tenant space fixture: 'test-tenant-space' from vitest.config.ts produces CDN URLs like this.
const TENANT_IMAGE_URL_PATTERN =
  /^https:\/\/test-tenant-space\.cdn\.scayle\.cloud\/tenant-image-hash$/

describe('OrderMapperService', () => {
  const context = createMockStorefrontContext({
    country: { currency: { currencyCode: 'USD' }, locale: 'en-US' },
  })
  const mapper = new OrderMapperService(context)

  it('keeps the base mapping of everything but the products', () => {
    const apiOrder = createApiOrder()
    const base = new OrderMapper(context).mapOrder(apiOrder)

    expect(mapper.mapOrder(apiOrder)).toMatchObject({
      ...base,
      deliveries: base.deliveries.map((delivery) => ({
        ...delivery,
        items: delivery.items.map((item) => ({
          ...item,
          product: expect.any(Object),
        })),
      })),
    })
  })

  it('links the product to its detail page and resolves its image on the CDN', () => {
    const apiOrder = createApiOrder({
      items: [
        createApiOrderItem({
          product: {
            ...createApiOrderItem().product,
            id: 42,
            images: [
              { hash: 'tenant-image-hash', name: 'tenant-image-name.jpg' },
            ],
          },
        }),
      ],
    })

    const product = mapper.mapOrder(apiOrder).deliveries[0]!.items[0]!.product

    expect(product.link).toBe('/p/test-product-42')
    expect(product.image?.url).toMatch(TENANT_IMAGE_URL_PATTERN)
  })

  it('falls back to an empty image when the product has no images', () => {
    // The Customer Account API omits `images` on some line items (e.g.
    // subscription package items), so the product fragment can arrive
    // without an `images` array. The mapper must not throw.
    const apiOrder = createApiOrder({
      items: [
        createApiOrderItem({
          product: { ...createApiOrderItem().product, images: undefined },
        }),
      ],
    })

    const result = mapper.mapOrder(apiOrder)

    expect(result.deliveries[0]!.items[0]!.product.image).toBeUndefined()
  })

  it('falls back to the legacy product.name when the attribute bag is absent', () => {
    // Subscription order items arrive with a stripped product fragment (only
    // id, name, timestamps, no attributes). The mapper must use the legacy
    // top-level `product.name` for both the display name and the link slug.
    const apiOrder = createApiOrder({
      items: [
        createApiOrderItem({
          product: {
            ...createApiOrderItem().product,
            id: 206136,
            name: 'Sneaker Forum Bold',
            attributes: {},
          },
        }),
      ],
    })

    const product = mapper.mapOrder(apiOrder).deliveries[0]!.items[0]!.product

    expect(product.name).toBe('Sneaker Forum Bold')
    expect(product.link).toBe('/p/sneaker-forum-bold-206136')
  })

  it('links a product without a name to its detail page with the fallback slug', () => {
    const apiOrder = createApiOrder({
      items: [
        createApiOrderItem({
          product: {
            ...createApiOrderItem().product,
            id: 206137,
            name: '',
            attributes: {},
          },
        }),
      ],
    })

    const product = mapper.mapOrder(apiOrder).deliveries[0]!.items[0]!.product

    expect(product.link).toBe('/p/product-206137')
  })
})
