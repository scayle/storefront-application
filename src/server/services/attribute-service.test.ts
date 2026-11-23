import { describe, expect, it, vi } from 'vitest'
import type { AttributeGroupMulti, Value } from '@scayle/storefront-api'
import { ATTRIBUTE_KEY_IMAGE_TYPE } from '@shared/constants/attributeKeys'
import { createMockStorefrontContext } from '../../test/utils/context'
import { ShopAttributeService } from './attribute-service'

const imageTypeGroup = (values: Value[]): AttributeGroupMulti => ({
  id: 3,
  key: ATTRIBUTE_KEY_IMAGE_TYPE,
  label: 'Image type',
  type: null,
  multiSelect: true,
  values,
})

// Caching and the not-found and error handling belong to the inherited
// `fetchAttributeGroup` and are tested in `@scayle/storefront`. These tests
// stub it and cover only what this class adds.
const createService = (group: AttributeGroupMulti | null) => {
  const service = new ShopAttributeService(createMockStorefrontContext())
  const fetchAttributeGroup = vi
    .spyOn(service, 'fetchAttributeGroup')
    .mockResolvedValue(group)
  return { service, fetchAttributeGroup }
}

describe('ShopAttributeService.fetchImageViewOptions', () => {
  it('reads the imageType attribute group', async () => {
    const { service, fetchAttributeGroup } = createService(null)

    await service.fetchImageViewOptions()

    expect(fetchAttributeGroup).toHaveBeenCalledWith(ATTRIBUTE_KEY_IMAGE_TYPE)
  })

  it('maps each value to its stable value and delivered label, in delivered order', async () => {
    const { service } = createService(
      imageTypeGroup([
        { id: 2, label: 'Type B', value: 'type-b' },
        { id: 1, label: 'Type A', value: 'type-a' },
      ]),
    )

    await expect(service.fetchImageViewOptions()).resolves.toEqual([
      { value: 'type-b', label: 'Type B' },
      { value: 'type-a', label: 'Type A' },
    ])
  })

  it('skips a value without a stable value and keeps the others', async () => {
    const { service } = createService(
      imageTypeGroup([
        { id: 9, label: 'Unkeyed' },
        { id: 1, label: 'Type A', value: 'type-a' },
      ]),
    )

    await expect(service.fetchImageViewOptions()).resolves.toEqual([
      { value: 'type-a', label: 'Type A' },
    ])
  })

  it.for([
    { when: 'the shop has no imageType group', group: null },
    { when: 'the group has no values', group: imageTypeGroup([]) },
  ])('offers no image views when $when', async ({ group }) => {
    const { service } = createService(group)

    await expect(service.fetchImageViewOptions()).resolves.toEqual([])
  })
})
