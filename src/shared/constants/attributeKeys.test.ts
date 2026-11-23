import { describe, expect, it } from 'vitest'
import * as attributeKeys from './attributeKeys'

describe('attributeKeys constants', () => {
  // These keys reach the Storefront API as `attributes.withKey` includes and as
  // `getFirstAttributeValue` lookups. Two constants sharing one key would read
  // as two concepts while resolving the same attribute group.
  it('maps every constant to a distinct attribute key', () => {
    const keys = Object.values(attributeKeys)

    expect(new Set(keys).size).toBe(keys.length)
  })
})
