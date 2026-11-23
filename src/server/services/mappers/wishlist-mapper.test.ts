import { describe, it, expect } from 'vitest'
import {
  createMockMapperRegistry,
  createMockSession,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { createMockCustomer } from '../../../test/mock-data/customers'
import { WishlistMapperService } from './wishlist-mapper'

describe('WishlistMapperService', () => {
  const context = createMockStorefrontContext()
  const mapper = new WishlistMapperService(
    context,
    createMockMapperRegistry(context),
  )

  describe('getWishlistKey', () => {
    it('keys the wishlist of a user who is not signed in by the session', () => {
      const firstSession = createMockSession({ sessionId: 'session-1' })
      const secondSession = createMockSession({ sessionId: 'session-2' })

      expect(mapper.getWishlistKey(firstSession)).not.toBe(
        mapper.getWishlistKey(secondSession),
      )
    })

    it('keys the wishlist of a signed-in customer by the customer across sessions', () => {
      const customer = createMockCustomer({ id: 42 })
      const firstSession = createMockSession({
        sessionId: 'session-1',
        customer,
      })
      const secondSession = createMockSession({
        sessionId: 'session-2',
        customer,
      })

      expect(mapper.getWishlistKey(firstSession)).toBe(
        mapper.getWishlistKey(secondSession),
      )
      expect(mapper.getWishlistKey(firstSession)).not.toBe(
        mapper.getWishlistKey(createMockSession({ sessionId: 'session-1' })),
      )
    })
  })

  describe('Includes', () => {
    it('requests each item product with the listing product includes', () => {
      const mapperWithProductIncludes = new WishlistMapperService(
        context,
        createMockMapperRegistry(context, {
          product: { Includes: { priceRange: true } },
        }),
      )

      expect(mapperWithProductIncludes.Includes).toEqual({
        items: { product: { priceRange: true } },
      })
    })
  })
})
