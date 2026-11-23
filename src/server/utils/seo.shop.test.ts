import { describe, expect, it } from 'vitest'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { generateOnlineStoreSchema, withShopName } from './seo'

const i18n = createMockMapperRegistry(createMockStorefrontContext()).i18n

describe('generateOnlineStoreSchema', () => {
  it('returns OnlineStore schema with name, url, and logo', () => {
    const result = generateOnlineStoreSchema({
      name: 'Storefront DE',
      url: 'https://shop.example.com',
      logo: 'https://shop.example.com/logo.svg',
    })

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: 'Storefront DE',
      url: 'https://shop.example.com',
      logo: 'https://shop.example.com/logo.svg',
    })
  })

  it.for([
    { case: 'an empty string', logo: '' },
    { case: 'undefined', logo: undefined },
  ])('omits logo when logo is $case', ({ logo }) => {
    const result = generateOnlineStoreSchema({
      name: 'Storefront',
      url: 'https://shop.example.com',
      logo,
    })

    expect(result).toStrictEqual({
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: 'Storefront',
      url: 'https://shop.example.com',
    })
  })

  it.for([
    { case: 'an empty name', name: '', url: 'https://shop.example.com' },
    { case: 'no name', name: undefined, url: 'https://shop.example.com' },
    { case: 'an empty url', name: 'Storefront', url: '' },
  ])('returns undefined for $case', ({ name, url }) => {
    expect(generateOnlineStoreSchema({ name, url })).toBeUndefined()
  })
})

describe('withShopName', () => {
  it.for([
    { shopName: 'Storefront DE', expected: 'Jacke | Storefront DE' },
    { shopName: undefined, expected: 'Jacke' },
    { shopName: '', expected: 'Jacke' },
  ])(
    'returns "$expected" for shop name $shopName',
    ({ shopName, expected }) => {
      expect(withShopName(i18n, 'Jacke', shopName)).toBe(expected)
    },
  )
})
