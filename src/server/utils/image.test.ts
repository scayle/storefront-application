import { describe, expect, it } from 'vitest'
import type {
  AttributeGroup,
  Attributes,
  ProductImage as StorefrontAPIProductImage,
} from '@scayle/storefront-api'
import {
  ATTRIBUTE_KEY_APPLY_PADDING,
  ATTRIBUTE_KEY_IMAGE_TYPE,
} from '@shared/constants/attributeKeys'
import { mapImage, shouldApplyPadding } from './image'

const flagAttribute = (key: string): Attributes => ({
  [key]: {
    id: 1,
    key,
    label: key,
    type: key,
    multiSelect: false,
    values: { label: 'true' },
  } as AttributeGroup,
})

const imageTypeAttribute = (value: string): Attributes => ({
  [ATTRIBUTE_KEY_IMAGE_TYPE]: {
    id: 3,
    key: ATTRIBUTE_KEY_IMAGE_TYPE,
    label: 'Image type',
    type: null,
    multiSelect: false,
    values: { id: 7, label: 'Type A', value },
  } as AttributeGroup,
})

const createImage = (attributes?: Attributes): StorefrontAPIProductImage => ({
  hash: 'images/shirt.jpg',
  name: 'shirt.jpg',
  url: 'https://cdn.example.com/images/shirt.jpg',
  attributes,
})

describe('shouldApplyPadding', () => {
  // The attribute is only set for trimmed images, so presence is the signal. SCAYLE
  // has no boolean attribute type to read a value from.
  it.for([
    {
      case: 'the applyPadding attribute is present',
      attributes: flagAttribute(ATTRIBUTE_KEY_APPLY_PADDING),
      expected: true,
    },
    {
      case: 'the attributes omit applyPadding',
      attributes: flagAttribute('imageType'),
      expected: false,
    },
    {
      case: 'the image has no attributes at all',
      attributes: undefined,
      expected: false,
    },
  ])('returns $expected when $case', ({ attributes, expected }) => {
    expect(shouldApplyPadding(createImage(attributes))).toBe(expected)
  })
})

describe('mapImage', () => {
  // tenantSpace comes from `STOREFRONT_TENANT_SPACE` in vitest.config.ts
  // (`test-tenant-space`), so `resolveImageUrl` prefixes the hash with that CDN host.
  it('maps a Storefront API image to the shared ProductImage shape', () => {
    expect(mapImage(createImage())).toEqual({
      url: 'https://cdn.example.com/images/shirt.jpg',
      name: 'shirt.jpg',
      applyPadding: false,
    })
  })

  it('falls back to resolving the hash when the Storefront API omits url', () => {
    expect(mapImage({ hash: 'abc', name: 'abc.jpg' }).url).toBe(
      'https://test-tenant-space.cdn.scayle.cloud/abc',
    )
  })

  it('populates applyPadding from the image attributes', () => {
    const padded = createImage(flagAttribute(ATTRIBUTE_KEY_APPLY_PADDING))
    expect(mapImage(padded).applyPadding).toBe(true)
    expect(mapImage(createImage()).applyPadding).toBe(false)
  })

  it('populates imageType from the stable value of the imageType attribute', () => {
    const image = createImage(imageTypeAttribute('type-a'))
    expect(mapImage(image).imageType).toBe('type-a')
  })

  it('leaves imageType undefined when the image carries no imageType value', () => {
    expect(mapImage(createImage()).imageType).toBeUndefined()
  })
})
