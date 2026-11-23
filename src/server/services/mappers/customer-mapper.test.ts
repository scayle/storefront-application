import { describe, it, expect } from 'vitest'
import type { ShopCustomer } from '@scayle/storefront/types'
import { CustomerMapper } from '@scayle/storefront/mappers'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { CustomerMapperService } from './customer-mapper'

// Only `mapCustomer` is overridden here. Order-summary mapping is inherited from
// the SDK base mapper, which is where its delegation is covered.
const context = createMockStorefrontContext()
const mappers = createMockMapperRegistry(context)
const customerMapper = new CustomerMapperService(context, mappers)

describe('customer mapper', () => {
  describe('mapCustomer', () => {
    const customer = {
      id: 42,
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
    } as ShopCustomer

    it('keeps the base mapping', () => {
      expect(customerMapper.mapCustomer(customer)).toMatchObject(
        new CustomerMapper(context, mappers).mapCustomer(customer),
      )
    })

    it('adds the hashed customer id as idHash', () => {
      // SHA-256 of `'42'`: GA4 sends it as `user_id`.
      expect(customerMapper.mapCustomer(customer).idHash).toBe(
        '73475cb40a568e8da8a045ced110137e159f890ac4da883b6b17dc651b3a8049',
      )
    })
  })
})
