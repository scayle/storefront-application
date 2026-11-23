import { describe, it, expect } from 'vitest'
import type { CategoryMapper } from '@scayle/storefront/mappers'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { SearchMapperService } from './search-mapper'
import type { ProductMapperService } from './product-mapper'

function createService() {
  const context = createMockStorefrontContext()

  return new SearchMapperService(
    context,
    createMockMapperRegistry(context, {
      product: {
        Includes: { priceRange: true },
      } as unknown as ProductMapperService,
      category: {} as unknown as CategoryMapper,
    }),
  )
}

describe('SearchMapperService', () => {
  describe('Includes', () => {
    it('requests the products with the listing product includes', () => {
      expect(createService().Includes.product).toEqual({ priceRange: true })
    })

    it('requests the category parents for the suggestion breadcrumbs', () => {
      expect(createService().Includes.categories?.parents).toBe('all')
    })

    it('requests the sale property of each category', () => {
      expect(createService().Includes.categories?.properties).toEqual(['sale'])
    })
  })

  describe('getSearchResultsPath', () => {
    it('builds the tenant search-results route for a term', () => {
      expect(createService().getSearchResultsPath('shoes')).toBe(
        '/search?filters[term]=shoes',
      )
    })
  })
})
