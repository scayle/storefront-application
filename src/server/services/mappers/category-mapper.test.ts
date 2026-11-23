import { describe, expect, it } from 'vitest'
import { createApiCategory } from '@scayle/storefront/test'
import { createMockStorefrontContext } from '../../../test/utils/context'
import { CategoryMapperService } from './category-mapper'

describe('CategoryMapperService', () => {
  describe('Includes', () => {
    it('requests the parents, the sale property, and the product sorting', () => {
      const service = new CategoryMapperService(createMockStorefrontContext())

      expect(service.Includes).toEqual({
        parents: 'all',
        properties: { withName: ['sale'] },
        includeProductSorting: true,
      })
    })
  })

  describe('NavigationIncludes', () => {
    it('requests only the sale property', () => {
      const service = new CategoryMapperService(createMockStorefrontContext())

      expect(service.NavigationIncludes).toEqual({
        properties: { withName: ['sale'] },
      })
    })
  })

  describe('getPath', () => {
    it('builds the product listing route from category id and path', () => {
      const service = new CategoryMapperService(createMockStorefrontContext())
      const category = createApiCategory({
        id: 5,
        path: '/women/shoes',
      })

      expect(service.getPath(category)).toBe('/c/women/shoes-5')
    })
  })
})
